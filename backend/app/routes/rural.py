"""
Rural Care & Referral Routes — /api/v1/rural
PHC queue management, referral creation, and tele-consultation scheduling.
"""
import logging

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.patient import QueueEntry, ReferralRecord, ReferralRequest
from app.services import dynamodb_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/rural")


@router.get(
    "/queue",
    response_model=list[QueueEntry],
    summary="Get PHC queue with patient status",
    description="Returns active patient queue for a Primary Health Centre facility.",
)
async def get_rural_queue(
    facility_id: str | None = Query(default=None, description="Filter by PHC facility ID"),
) -> list[QueueEntry]:
    return await dynamodb_service.get_queue(facility_id=facility_id)


@router.post(
    "/referral",
    response_model=ReferralRecord,
    status_code=status.HTTP_201_CREATED,
    summary="Initiate a patient referral",
    description=(
        "Creates a referral record for a patient — either to a District Hospital "
        "or for a Tele-consultation session. Updates patient queue status to REFERRED."
    ),
)
async def create_referral(payload: ReferralRequest) -> ReferralRecord:
    # Verify patient exists
    patient = await dynamodb_service.get_patient(payload.patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient '{payload.patient_id}' not found. Cannot create referral.",
        )
    try:
        record = await dynamodb_service.create_referral(payload)
        logger.info(
            "Referral %s created for patient %s (%s)",
            record.referral_id, payload.patient_id, payload.referral_type.value,
        )
        return record
    except Exception as e:
        logger.exception("Referral creation failed for patient %s", payload.patient_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Referral creation failed. Please try again.",
        )


@router.get(
    "/referrals",
    response_model=list[ReferralRecord],
    summary="List active referrals",
)
async def list_referrals(
    facility_id: str | None = Query(default=None),
) -> list[ReferralRecord]:
    return await dynamodb_service.list_referrals(facility_id=facility_id)


@router.get(
    "/stats",
    summary="PHC dashboard statistics",
)
async def get_rural_stats(
    facility_id: str | None = Query(default=None),
) -> dict:
    """Quick summary stats for the rural care dashboard header."""
    queue = await dynamodb_service.get_queue(facility_id=facility_id)
    referrals = await dynamodb_service.list_referrals(facility_id=facility_id)
    patients, total = await dynamodb_service.list_patients()
    return {
        "total_patients_today": total,
        "waiting": sum(1 for q in queue if q.queue_status.value == "waiting"),
        "in_progress": sum(1 for q in queue if q.queue_status.value == "in_progress"),
        "active_referrals": len([r for r in referrals if r.status.value == "pending"]),
        "completed_today": sum(1 for p in patients if p.queue_status.value == "completed"),
    }
