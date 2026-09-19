"""
Amazon DynamoDB Service — Patient Records & Queue Management
Single-table design with GSI on queue_status for efficient queue queries.
Falls back to in-memory store when MOCK_MODE=true.
"""
import logging
import uuid
from datetime import datetime
from typing import Any
from decimal import Decimal

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.config import get_settings
from app.schemas.patient import (
    PatientRecord,
    PatientSummaryUpdate,
    QueueEntry,
    QueueStatus,
    ReferralRecord,
    ReferralRequest,
    ReferralStatus,
    Severity,
)

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Helper: Convert floats to Decimals for DynamoDB ──────────────
def float_to_decimal(obj: Any) -> Any:
    """Recursively convert float types to Decimal for DynamoDB compatibility."""
    if isinstance(obj, list):
        return [float_to_decimal(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: float_to_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, float):
        return Decimal(str(obj))
    return obj


# ── In-Memory Mock Store ──────────────────────────────────────────
# Seeded with realistic test patients for demo
_MOCK_PATIENTS: dict[str, dict] = {}
_MOCK_REFERRALS: dict[str, dict] = {}


def _seed_mock_data():
    """Seed in-memory store with demo patient data."""
    patients = [
        {
            "patient_id": "PT-DEMO-001",
            "abha_token": "ABHA-TEST-9901",
            "patient_name": "Rajesh Kumar",
            "age": 52,
            "gender": "Male",
            "facility_id": "PHC-MH-001",
            "queue_status": QueueStatus.WAITING.value,
            "raw_transcript": "Mujhe seene mein dard ho raha hai, saath mein saans lene mein takleef hai",
            "physician_notes": None,
            "clinical_summary": None,
            "ocr_results": [],
            "referral_ids": [],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        },
        {
            "patient_id": "PT-DEMO-002",
            "abha_token": "ABHA-TEST-9902",
            "patient_name": "Sunita Devi",
            "age": 38,
            "gender": "Female",
            "facility_id": "PHC-MH-001",
            "queue_status": QueueStatus.IN_PROGRESS.value,
            "raw_transcript": "Three days fever, body aches, headache, loss of appetite",
            "physician_notes": None,
            "clinical_summary": None,
            "ocr_results": [],
            "referral_ids": [],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        },
        {
            "patient_id": "PT-DEMO-003",
            "abha_token": "ABHA-TEST-9903",
            "patient_name": "Mohammed Irfan",
            "age": 65,
            "gender": "Male",
            "facility_id": "PHC-MH-001",
            "queue_status": QueueStatus.REFERRED.value,
            "raw_transcript": "Sugar high, blurred vision, feet tingling",
            "physician_notes": "Diabetic neuropathy suspected. Referred to district hospital.",
            "clinical_summary": None,
            "ocr_results": [],
            "referral_ids": ["REF-DEMO001"],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        },
        {
            "patient_id": "PT-DEMO-004",
            "abha_token": "ABHA-TEST-9904",
            "patient_name": "Priya Sharma",
            "age": 27,
            "gender": "Female",
            "facility_id": "PHC-MH-001",
            "queue_status": QueueStatus.WAITING.value,
            "raw_transcript": "Pregnancy, 8 months, high blood pressure",
            "physician_notes": None,
            "clinical_summary": None,
            "ocr_results": [],
            "referral_ids": [],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        },
        {
            "patient_id": "PT-DEMO-005",
            "abha_token": "ABHA-TEST-9905",
            "patient_name": "Lakshmi Bai",
            "age": 45,
            "gender": "Female",
            "facility_id": "PHC-MH-001",
            "queue_status": QueueStatus.COMPLETED.value,
            "raw_transcript": "Severe anaemia, weakness, breathlessness on exertion",
            "physician_notes": "Iron deficiency anaemia. Started on iron + folic acid.",
            "clinical_summary": None,
            "ocr_results": [],
            "referral_ids": [],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        },
    ]
    for p in patients:
        _MOCK_PATIENTS[p["patient_id"]] = p

    referrals = [
        {
            "referral_id": "REF-DEMO001",
            "patient_id": "PT-DEMO-003",
            "referral_type": "district_hospital",
            "reason": "Diabetic neuropathy — needs specialist evaluation and advanced diagnostics",
            "destination_facility": "District Government Hospital, Nashik",
            "urgency": Severity.MODERATE.value,
            "referring_physician": "Dr. Arun Patil",
            "notes": "Patient needs HbA1c, nerve conduction study",
            "status": ReferralStatus.PENDING.value,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
    ]
    for r in referrals:
        _MOCK_REFERRALS[r["referral_id"]] = r


_seed_mock_data()


def _build_dynamodb():
    kwargs = {"region_name": settings.aws_region}
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        kwargs["aws_access_key_id"] = settings.aws_access_key_id
        kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
    return boto3.resource("dynamodb", **kwargs)


def _to_patient_record(data: dict) -> PatientRecord:
    """Convert DynamoDB / mock dict to PatientRecord."""
    data = dict(data)
    for dt_field in ["created_at", "updated_at"]:
        if isinstance(data.get(dt_field), str):
            data[dt_field] = datetime.fromisoformat(data[dt_field])
    return PatientRecord(**data)


# ── Patient CRUD ──────────────────────────────────────────────────
async def create_patient(record: PatientRecord) -> PatientRecord:
    if settings.mock_mode:
        _MOCK_PATIENTS[record.patient_id] = record.model_dump(mode="json")
        logger.debug("MOCK: created patient %s", record.patient_id)
        return record
    try:
        db = _build_dynamodb()
        table = db.Table(settings.dynamodb_table_name)
        item = record.model_dump(mode="json")
        item["PK"] = f"PATIENT#{record.patient_id}"
        item["SK"] = f"PATIENT#{record.patient_id}"
        item["GSI1PK"] = f"QUEUE#{record.queue_status.value}"
        item = float_to_decimal(item)
        table.put_item(Item=item)
        return record
    except (BotoCoreError, ClientError) as e:
        logger.error("DynamoDB create_patient error: %s", str(e))
        raise


async def get_patient(patient_id: str) -> PatientRecord | None:
    if settings.mock_mode:
        data = _MOCK_PATIENTS.get(patient_id)
        return _to_patient_record(data) if data else None
    try:
        db = _build_dynamodb()
        table = db.Table(settings.dynamodb_table_name)
        response = table.get_item(
            Key={"PK": f"PATIENT#{patient_id}", "SK": f"PATIENT#{patient_id}"}
        )
        item = response.get("Item")
        return _to_patient_record(item) if item else None
    except (BotoCoreError, ClientError) as e:
        logger.error("DynamoDB get_patient error: %s", str(e))
        raise


async def list_patients(
    page: int = 1,
    page_size: int = 20,
    status_filter: QueueStatus | None = None,
) -> tuple[list[PatientRecord], int]:
    if settings.mock_mode:
        all_patients = list(_MOCK_PATIENTS.values())
        if status_filter:
            all_patients = [p for p in all_patients if p["queue_status"] == status_filter.value]
        total = len(all_patients)
        start = (page - 1) * page_size
        end = start + page_size
        return [_to_patient_record(p) for p in all_patients[start:end]], total
    try:
        db = _build_dynamodb()
        table = db.Table(settings.dynamodb_table_name)
        response = table.scan(Limit=page_size)
        items = response.get("Items", [])
        return [_to_patient_record(item) for item in items], len(items)
    except (BotoCoreError, ClientError) as e:
        logger.error("DynamoDB list_patients error: %s", str(e))
        raise


async def update_patient_summary(
    patient_id: str,
    update: PatientSummaryUpdate,
) -> PatientRecord | None:
    patient = await get_patient(patient_id)
    if not patient:
        return None
    patient.clinical_summary = update.clinical_summary
    if update.physician_notes:
        patient.physician_notes = update.physician_notes
    if update.queue_status:
        patient.queue_status = update.queue_status
    patient.updated_at = datetime.utcnow()

    if settings.mock_mode:
        _MOCK_PATIENTS[patient_id] = patient.model_dump(mode="json")
        return patient
    try:
        db = _build_dynamodb()
        table = db.Table(settings.dynamodb_table_name)
        item = patient.model_dump(mode="json")
        item = float_to_decimal(item)
        table.put_item(Item=item)
        return patient
    except (BotoCoreError, ClientError) as e:
        logger.error("DynamoDB update_patient_summary error: %s", str(e))
        raise


# ── Queue ─────────────────────────────────────────────────────────
async def get_queue(facility_id: str | None = None) -> list[QueueEntry]:
    if settings.mock_mode:
        patients = list(_MOCK_PATIENTS.values())
        if facility_id:
            patients = [p for p in patients if p.get("facility_id") == facility_id]
        active = [p for p in patients if p["queue_status"] in [
            QueueStatus.WAITING.value, QueueStatus.IN_PROGRESS.value
        ]]
        return [
            QueueEntry(
                patient_id=p["patient_id"],
                patient_name=p["patient_name"],
                abha_token=p["abha_token"],
                queue_status=QueueStatus(p["queue_status"]),
                arrival_time=datetime.fromisoformat(p["created_at"]),
                estimated_wait_minutes=15 if p["queue_status"] == QueueStatus.WAITING.value else 5,
                chief_complaint=p.get("raw_transcript", "")[:80] if p.get("raw_transcript") else None,
                severity=Severity.MODERATE,
                facility_id=p.get("facility_id"),
            )
            for p in active
        ]
    patients, _ = await list_patients(status_filter=QueueStatus.WAITING)
    return [
        QueueEntry(
            patient_id=p.patient_id,
            patient_name=p.patient_name,
            abha_token=p.abha_token,
            queue_status=p.queue_status,
            arrival_time=p.created_at,
            facility_id=p.facility_id,
        )
        for p in patients
    ]


# ── Referrals ─────────────────────────────────────────────────────
async def create_referral(request: ReferralRequest) -> ReferralRecord:
    record = ReferralRecord(**request.model_dump())
    if settings.mock_mode:
        _MOCK_REFERRALS[record.referral_id] = record.model_dump(mode="json")
        if request.patient_id in _MOCK_PATIENTS:
            _MOCK_PATIENTS[request.patient_id]["referral_ids"].append(record.referral_id)
            _MOCK_PATIENTS[request.patient_id]["queue_status"] = QueueStatus.REFERRED.value
        return record
    try:
        db = _build_dynamodb()
        table = db.Table(settings.dynamodb_table_name)
        item = record.model_dump(mode="json")
        item["PK"] = f"REFERRAL#{record.referral_id}"
        item["SK"] = f"PATIENT#{record.patient_id}"
        item = float_to_decimal(item)
        table.put_item(Item=item)
        return record
    except (BotoCoreError, ClientError) as e:
        logger.error("DynamoDB create_referral error: %s", str(e))
        raise


async def list_referrals(facility_id: str | None = None) -> list[ReferralRecord]:
    if settings.mock_mode:
        return [ReferralRecord(**r) for r in _MOCK_REFERRALS.values()]
    try:
        db = _build_dynamodb()
        table = db.Table(settings.dynamodb_table_name)
        response = table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr("PK").begins_with("REFERRAL#")
        )
        return [ReferralRecord(**item) for item in response.get("Items", [])]
    except (BotoCoreError, ClientError) as e:
        logger.error("DynamoDB list_referrals error: %s", str(e))
        raise
