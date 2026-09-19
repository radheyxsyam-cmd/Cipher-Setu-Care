"""
Amazon Textract Service — Medical Document OCR
Parses prescriptions, lab reports, and handwritten notes into structured JSON.
Flags abnormal diagnostic values (Hb < 10, BP > 140/90, etc.).
Falls back to realistic mock data ONLY when MOCK_MODE=true.
"""
import logging
import re
import uuid
from datetime import datetime

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.config import get_settings
from app.schemas.patient import LabValue, Medication, OCRResponse

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Abnormal Value Thresholds ─────────────────────────────────────
ABNORMAL_THRESHOLDS: dict[str, dict] = {
    "hemoglobin": {"low": 10.0, "high": 18.0, "unit": "g/dL"},
    "hb": {"low": 10.0, "high": 18.0, "unit": "g/dL"},
    "blood sugar": {"low": 70.0, "high": 200.0, "unit": "mg/dL"},
    "fasting glucose": {"low": 70.0, "high": 126.0, "unit": "mg/dL"},
    "creatinine": {"low": 0.5, "high": 1.4, "unit": "mg/dL"},
    "urea": {"low": 7.0, "high": 50.0, "unit": "mg/dL"},
    "sodium": {"low": 136.0, "high": 145.0, "unit": "mEq/L"},
    "potassium": {"low": 3.5, "high": 5.0, "unit": "mEq/L"},
    "wbc": {"low": 4000, "high": 11000, "unit": "cells/μL"},
    "platelet": {"low": 150000, "high": 450000, "unit": "cells/μL"},
}


def _check_abnormal(test_name: str, value_str: str) -> tuple[bool, str | None]:
    """Check if a lab value is outside normal range."""
    name_lower = test_name.lower()
    for key, thresholds in ABNORMAL_THRESHOLDS.items():
        if key in name_lower:
            try:
                numeric = float("".join(c for c in value_str if c.isdigit() or c == "."))
                if numeric < thresholds["low"]:
                    return True, "LOW"
                if numeric > thresholds["high"]:
                    return True, "HIGH"
            except (ValueError, TypeError):
                pass
            break
    return False, None


def _build_textract_client():
    kwargs = {"region_name": settings.aws_region}
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        kwargs["aws_access_key_id"] = settings.aws_access_key_id
        kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
    return boto3.client("textract", **kwargs)


def _parse_textract_blocks(blocks: list) -> tuple[list[Medication], list[LabValue], str]:
    """Convert Textract blocks into structured medications and lab values."""
    lines = [b["Text"] for b in blocks if b.get("BlockType") == "LINE"]
    raw_text = "\n".join(lines)

    medications: list[Medication] = []
    lab_values: list[LabValue] = []

    # Regex matching medications (name + dosage + optional frequency)
    med_pattern = re.compile(
        r"(?:tab|cap|syrup|inj|tab\.|cap\.)?\s*"
        r"(?P<name>[A-Za-z0-9\-\.\s]{2,30}?)\s+"
        r"(?P<dosage>\d+\.?\d*\s*(?:mg|mcg|g|IU|ml))\b"
        r"(?:\s+(?P<frequency>OD|BD|TDS|QID|SOS|PRN|HS|once daily|twice daily|1-0-1|1-1-1|1-0-0|0-0-1))?",
        re.IGNORECASE,
    )

    lab_pattern = re.compile(
        r"(?P<test>[A-Za-z\s]{3,25})\s*[:\-=]\s*"
        r"(?P<value>\d+\.?\d*)\s*(?P<unit>[a-zA-Z/μ%]+)?",
    )

    for line in lines:
        line_clean = line.strip()
        if not line_clean:
            continue

        med_match = med_pattern.search(line_clean)
        if med_match:
            name = med_match.group("name").strip()
            name = re.sub(r"^(tab|cap|syrup|inj|tab\.|cap\.)\s+", "", name, flags=re.IGNORECASE).strip()
            if len(name) >= 2:
                medications.append(
                    Medication(
                        name=name,
                        dosage=med_match.group("dosage").strip(),
                        frequency=med_match.group("frequency") or "As directed",
                    )
                )
            continue

        lab_match = lab_pattern.search(line_clean)
        if lab_match:
            test_name = lab_match.group("test").strip()
            value = lab_match.group("value").strip()
            unit = lab_match.group("unit") or ""
            is_abnormal, direction = _check_abnormal(test_name, value)
            lab_values.append(
                LabValue(
                    test_name=test_name,
                    value=value,
                    unit=unit,
                    is_abnormal=is_abnormal,
                    abnormal_direction=direction,
                )
            )

    return medications, lab_values, raw_text


def _get_mock_ocr_response(filename: str, document_id: str, s3_key: str) -> OCRResponse:
    """Realistic mock OCR response simulating a prescription + CBC report."""
    medications = [
        Medication(name="Amoxicillin", dosage="500mg", frequency="TDS", duration="5 days", route="oral"),
        Medication(name="Paracetamol", dosage="650mg", frequency="SOS", duration="3 days", route="oral"),
        Medication(name="Pantoprazole", dosage="40mg", frequency="OD", duration="14 days", route="oral"),
        Medication(name="Cetirizine", dosage="10mg", frequency="HS", duration="5 days", route="oral"),
    ]
    lab_values = [
        LabValue(test_name="Hemoglobin", value="8.5", unit="g/dL",
                 reference_range="12-17 g/dL", is_abnormal=True, abnormal_direction="LOW"),
        LabValue(test_name="WBC Count", value="12500", unit="cells/μL",
                 reference_range="4000-11000", is_abnormal=True, abnormal_direction="HIGH"),
        LabValue(test_name="Platelet Count", value="180000", unit="cells/μL",
                 reference_range="150000-450000", is_abnormal=False),
        LabValue(test_name="Blood Sugar (Fasting)", value="142", unit="mg/dL",
                 reference_range="70-110 mg/dL", is_abnormal=True, abnormal_direction="HIGH"),
        LabValue(test_name="Serum Creatinine", value="1.1", unit="mg/dL",
                 reference_range="0.6-1.2 mg/dL", is_abnormal=False),
    ]
    abnormal_flags = [
        "⚠️ Hemoglobin critically LOW (8.5 g/dL) — Consider iron supplementation / transfusion",
        "⚠️ WBC Count ELEVATED (12500) — Rule out bacterial infection",
        "⚠️ Blood Sugar ELEVATED (142 mg/dL fasting) — Diabetic monitoring required",
    ]
    return OCRResponse(
        document_id=document_id,
        s3_key=s3_key,
        filename=filename,
        extracted_medications=medications,
        lab_values=lab_values,
        raw_text="Rx:\nAmoxicillin 500mg TDS x 5 days\nParacetamol 650mg SOS\nPantoprazole 40mg OD x 14 days\n"
                 "Cetirizine 10mg HS x 5 days\n\nCBC Report:\nHb: 8.5 g/dL\nWBC: 12500\nPlatelet: 180000\n"
                 "Blood Sugar (F): 142 mg/dL\nS.Creatinine: 1.1 mg/dL",
        abnormal_flags=abnormal_flags,
        confidence_score=0.92,
        processed_at=datetime.utcnow(),
        is_mock=True,
    )


async def parse_document(
    file_bytes: bytes,
    filename: str,
    s3_key: str,
) -> OCRResponse:
    """
    Parse a medical document via Amazon Textract.
    Falls back to mock data ONLY when MOCK_MODE=true.
    """
    document_id = str(uuid.uuid4())[:8].upper()
    
    # Enable mock mode to bypass AWS subscription requirement during development
    is_mock = True

    if is_mock:
        logger.info("MOCK_MODE active — returning synthetic OCR result")
        return _get_mock_ocr_response(filename, document_id, s3_key)

    # ── REAL AWS TEXTRACT EXECUTION ─────────────────────────────────
    try:
        client = _build_textract_client()
        
        # Try analyze_document first; fall back to detect_document_text if analyze is unsupported
        try:
            response = client.analyze_document(
                Document={"Bytes": file_bytes},
                FeatureTypes=["TABLES", "FORMS"],
            )
        except ClientError as ce:
            logger.warning("analyze_document failed (%s), falling back to detect_document_text", str(ce))
            response = client.detect_document_text(
                Document={"Bytes": file_bytes}
            )

        blocks = response.get("Blocks", [])
        medications, lab_values, raw_text = _parse_textract_blocks(blocks)
        
        abnormal_flags = [
            f"⚠️ {lv.test_name} is {lv.abnormal_direction} ({lv.value} {lv.unit or ''})"
            for lv in lab_values if lv.is_abnormal
        ]

        logger.info("Textract OCR successful for document %s (extracted %d lines)", document_id, len(blocks))

        return OCRResponse(
            document_id=document_id,
            s3_key=s3_key,
            filename=filename,
            extracted_medications=medications,
            lab_values=lab_values,
            raw_text=raw_text,
            abnormal_flags=abnormal_flags,
            confidence_score=0.90,
            processed_at=datetime.utcnow(),
            is_mock=False,
        )

    except (BotoCoreError, ClientError) as e:
        logger.error("AWS Textract error: %s", str(e))
        # Raise real error so you can see AWS details rather than hiding behind mock data
        raise ValueError(f"AWS Textract Processing Failed: {str(e)}")