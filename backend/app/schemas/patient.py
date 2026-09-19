"""
SETU-Care Pydantic v2 Schemas
Strict input validation — guards against XSS, injection, and invalid health data.
All ABHA identifiers use synthetic test placeholders (ABHA-TEST-XXXX).
Aadhaar references are NEVER stored or displayed — rendered as [Aadhaar Redacted].
"""
import re
import uuid
from datetime import datetime
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, Field, field_validator, model_validator


# ── Sanitization Helpers ──────────────────────────────────────────
_ABHA_PATTERN = re.compile(r"^ABHA-[A-Z]{2,6}-\d{4,10}$")
_SAFE_TEXT = re.compile(r"^[a-zA-Z0-9 .,\-()/\n\u0900-\u097F]+$")  # Allow Devanagari


def _sanitize_text(v: str, max_len: int = 5000) -> str:
    """Strip leading/trailing whitespace and enforce length."""
    v = v.strip()
    if len(v) > max_len:
        raise ValueError(f"Input exceeds maximum allowed length of {max_len} characters.")
    # Block basic script injection patterns
    if re.search(r"<script|javascript:|on\w+\s*=", v, re.IGNORECASE):
        raise ValueError("Input contains potentially unsafe content.")
    return v


# ── Enums ─────────────────────────────────────────────────────────
class Language(str, Enum):
    HINDI = "hi-IN"
    ENGLISH = "en-IN"
    BENGALI = "bn-IN"
    TAMIL = "ta-IN"
    TELUGU = "te-IN"
    MARATHI = "mr-IN"


class QueueStatus(str, Enum):
    WAITING = "waiting"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REFERRED = "referred"
    CANCELLED = "cancelled"


class ReferralType(str, Enum):
    DISTRICT_HOSPITAL = "district_hospital"
    TELE_CONSULTATION = "tele_consultation"
    SPECIALIST = "specialist"


class ReferralStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    COMPLETED = "completed"
    DECLINED = "declined"


class Severity(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


# ── Clinical Data Models ──────────────────────────────────────────
class VitalSigns(BaseModel):
    blood_pressure: str | None = Field(None, examples=["120/80 mmHg"])
    pulse: str | None = Field(None, examples=["72 bpm"])
    temperature: str | None = Field(None, examples=["98.6°F"])
    respiratory_rate: str | None = Field(None, examples=["16/min"])
    oxygen_saturation: str | None = Field(None, examples=["98%"])
    weight: str | None = Field(None, examples=["65 kg"])
    height: str | None = Field(None, examples=["165 cm"])


class RedFlag(BaseModel):
    symptom: str = Field(..., max_length=200)
    severity: Severity
    action_required: str = Field(..., max_length=500)


class Medication(BaseModel):
    name: str = Field(..., max_length=200)
    dosage: str | None = Field(None, max_length=100)
    frequency: str | None = Field(None, max_length=100)
    duration: str | None = Field(None, max_length=100)
    route: str | None = Field(None, max_length=50)


class LabValue(BaseModel):
    test_name: str = Field(..., max_length=200)
    value: str = Field(..., max_length=100)
    unit: str | None = Field(None, max_length=50)
    reference_range: str | None = Field(None, max_length=100)
    is_abnormal: bool = False
    abnormal_direction: str | None = Field(None, examples=["HIGH", "LOW"])


class ClinicalSummary(BaseModel):
    """SOCRATES-structured clinical summary output from Bedrock."""
    chief_complaint: str = Field(..., max_length=500)
    hpi: str = Field(..., max_length=3000)  # History of Present Illness
    past_history: list[str] = Field(default_factory=list, max_length=20)
    vitals_mentioned: VitalSigns = Field(default_factory=VitalSigns)
    medications_current: list[Medication] = Field(default_factory=list)
    red_flags: list[RedFlag] = Field(default_factory=list)
    suspected_diagnosis: list[str] = Field(default_factory=list, max_length=10)
    recommended_investigations: list[str] = Field(default_factory=list, max_length=15)
    language_detected: Language = Language.ENGLISH
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)


# ── Intake Schemas ────────────────────────────────────────────────
class PatientIntakeRequest(BaseModel):
    """Voice transcript intake payload from /kiosk."""
    transcript: Annotated[str, Field(min_length=10, max_length=5000)]
    language: Language = Language.ENGLISH
    abha_token: str = Field(
        default="ABHA-TEST-9901",
        max_length=50,
        description="Synthetic ABHA placeholder — never a real identifier",
        examples=["ABHA-TEST-9901"],
    )
    patient_name: str = Field(default="Anonymous", max_length=100)
    age: int | None = Field(None, ge=0, le=150)
    gender: str | None = Field(None, max_length=20)
    facility_id: str | None = Field(None, max_length=50)

    @field_validator("transcript")
    @classmethod
    def validate_transcript(cls, v: str) -> str:
        return _sanitize_text(v, max_len=5000)

    @field_validator("abha_token")
    @classmethod
    def validate_abha_token(cls, v: str) -> str:
        if not v.startswith("ABHA-TEST-"):
            raise ValueError(
                "Only synthetic ABHA test tokens are accepted (format: ABHA-TEST-XXXX). "
                "Real ABHA IDs must not be submitted through this endpoint."
            )
        return v

    @field_validator("patient_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        return _sanitize_text(v, max_len=100)


class PatientIntakeResponse(BaseModel):
    patient_id: str
    abha_token: str
    clinical_summary: ClinicalSummary
    raw_transcript: str
    processed_at: datetime
    is_mock: bool = False


# ── OCR Schemas ───────────────────────────────────────────────────
class OCRResponse(BaseModel):
    """Structured output from Textract document parsing."""
    document_id: str
    s3_key: str
    filename: str
    extracted_medications: list[Medication] = Field(default_factory=list)
    lab_values: list[LabValue] = Field(default_factory=list)
    raw_text: str = Field(default="", max_length=10000)
    abnormal_flags: list[str] = Field(default_factory=list)
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)
    processed_at: datetime
    is_mock: bool = False


# ── Patient Record ────────────────────────────────────────────────
class PatientRecord(BaseModel):
    """Full longitudinal patient record stored in DynamoDB."""
    patient_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    abha_token: str = Field(default="ABHA-TEST-9901")
    patient_name: str = Field(default="Anonymous", max_length=100)
    age: int | None = None
    gender: str | None = None
    facility_id: str | None = None
    queue_status: QueueStatus = QueueStatus.WAITING
    clinical_summary: ClinicalSummary | None = None
    ocr_results: list[OCRResponse] = Field(default_factory=list)
    raw_transcript: str | None = None
    physician_notes: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    referral_ids: list[str] = Field(default_factory=list)


class PatientSummaryUpdate(BaseModel):
    """Physician edits to AI-generated clinical summary."""
    clinical_summary: ClinicalSummary
    physician_notes: Annotated[str | None, Field(max_length=5000)] = None
    queue_status: QueueStatus | None = None

    @field_validator("physician_notes")
    @classmethod
    def validate_notes(cls, v: str | None) -> str | None:
        if v:
            return _sanitize_text(v, max_len=5000)
        return v


class PatientListResponse(BaseModel):
    patients: list[PatientRecord]
    total: int
    page: int
    page_size: int


# ── Referral Schemas ──────────────────────────────────────────────
class ReferralRequest(BaseModel):
    patient_id: str = Field(..., min_length=1, max_length=100)
    referral_type: ReferralType
    reason: Annotated[str, Field(min_length=10, max_length=2000)]
    destination_facility: str | None = Field(None, max_length=200)
    urgency: Severity = Severity.MODERATE
    referring_physician: str | None = Field(None, max_length=100)
    notes: str | None = Field(None, max_length=2000)

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, v: str) -> str:
        return _sanitize_text(v, max_len=2000)


class ReferralRecord(BaseModel):
    referral_id: str = Field(default_factory=lambda: f"REF-{str(uuid.uuid4())[:8].upper()}")
    patient_id: str
    referral_type: ReferralType
    reason: str
    destination_facility: str | None = None
    urgency: Severity
    referring_physician: str | None = None
    notes: str | None = None
    status: ReferralStatus = ReferralStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class QueueEntry(BaseModel):
    patient_id: str
    patient_name: str
    abha_token: str
    queue_status: QueueStatus
    arrival_time: datetime
    estimated_wait_minutes: int | None = None
    chief_complaint: str | None = None
    severity: Severity = Severity.LOW
    facility_id: str | None = None
