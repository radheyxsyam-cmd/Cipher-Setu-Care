"""
Doctor / Physician Dashboard Routes — /api/v1/doctor
Paginated patient list, full patient record, and summary editing.
"""
import logging

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.patient import (
    PatientListResponse,
    PatientRecord,
    PatientSummaryUpdate,
    QueueStatus,
)
from app.services import dynamodb_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/doctor")


@router.get(
    "/patients",
    response_model=PatientListResponse,
    summary="List patients (paginated)",
)
async def list_patients(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Patients per page"),
    status_filter: QueueStatus | None = Query(default=None, description="Filter by queue status"),
) -> PatientListResponse:
    patients, total = await dynamodb_service.list_patients(
        page=page,
        page_size=page_size,
        status_filter=status_filter,
    )
    return PatientListResponse(patients=patients, total=total, page=page, page_size=page_size)


@router.get(
    "/patient/{patient_id}",
    response_model=PatientRecord,
    summary="Get full patient record",
)
async def get_patient(patient_id: str) -> PatientRecord:
    record = await dynamodb_service.get_patient(patient_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient '{patient_id}' not found.",
        )
    return record


@router.put(
    "/patient/{patient_id}/summary",
    response_model=PatientRecord,
    summary="Save physician-edited clinical summary",
    description=(
        "Allows a physician to edit and save the AI-generated clinical summary for a patient. "
        "Updates are stored in DynamoDB and the queue status can be updated simultaneously."
    ),
)
async def update_patient_summary(
    patient_id: str,
    update: PatientSummaryUpdate,
) -> PatientRecord:
    record = await dynamodb_service.update_patient_summary(patient_id, update)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient '{patient_id}' not found.",
        )
    logger.info("Summary updated for patient %s", patient_id)
    return record
