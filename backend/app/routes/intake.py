"""
Clinical Intake Routes — /api/v1/intake
Handles voice transcript processing and patient queue.
"""
import uuid
import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException, status

from app.schemas.patient import (
    PatientIntakeRequest,
    PatientIntakeResponse,
    PatientRecord,
    QueueEntry,
    QueueStatus,
)
from app.services import bedrock_service, dynamodb_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/intake")


@router.post(
    "/process",
    response_model=PatientIntakeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Process voice transcript into clinical summary",
    description=(
        "Accepts a patient voice transcript, calls Google Gemini 3.6 Flash"
        "to extract a SOCRATES-structured clinical summary, and stores the patient record in DynamoDB."
    ),
)
async def process_intake(payload: PatientIntakeRequest) -> PatientIntakeResponse:
    patient_id = f"PT-{str(uuid.uuid4())[:8].upper()}"
    logger.info("Processing intake for patient %s (lang=%s)", patient_id, payload.language.value)
    try:
        result = await bedrock_service.extract_clinical_summary(
            transcript=payload.transcript,
            language=payload.language,
            patient_id=patient_id,
            abha_token=payload.abha_token,
        )
        # Store patient record
        record = PatientRecord(
            patient_id=patient_id,
            abha_token=payload.abha_token,
            patient_name=payload.patient_name,
            age=payload.age,
            gender=payload.gender,
            facility_id=payload.facility_id,
            queue_status=QueueStatus.WAITING,
            clinical_summary=result.clinical_summary,
            raw_transcript=payload.transcript,
        )
        await dynamodb_service.create_patient(record)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        logger.exception("Intake processing failed for patient %s", patient_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Clinical intake processing failed. Please try again.",
        )


@router.get(
    "/queue",
    response_model=list[QueueEntry],
    summary="Get pending patient queue",
)
async def get_queue(facility_id: str | None = None) -> list[QueueEntry]:
    return await dynamodb_service.get_queue(facility_id=facility_id)
