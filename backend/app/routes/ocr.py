"""
OCR Routes — /api/v1/ocr
Handles medical document upload, S3 storage, and Textract parsing.
"""
import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.config import get_settings
from app.schemas.patient import OCRResponse
from app.services import s3_service, textract_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ocr")
settings = get_settings()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "application/pdf"}


@router.post(
    "/scan",
    response_model=OCRResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload and OCR-parse a medical document",
    description=(
        "Accepts an uploaded prescription or lab report (JPEG/PNG/PDF, max 5MB). "
        "Uploads to S3 and calls Amazon Textract to extract medications, lab values, "
        "and flags abnormal diagnostic values."
    ),
)
async def scan_document(
    file: UploadFile = File(..., description="Medical document — JPEG, PNG, or PDF (max 5MB)"),
    patient_id: str = Form(default="PT-UNKNOWN", max_length=50),
) -> OCRResponse:
    # ── Validate content type ─────────────────────────────────────
    content_type = file.content_type or ""
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File type '{content_type}' not supported. Only JPEG, PNG, and PDF are accepted.",
        )

    # ── Read file ─────────────────────────────────────────────────
    file_bytes = await file.read()

    # ── Validate size ─────────────────────────────────────────────
    if len(file_bytes) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum allowed {settings.max_upload_size_mb}MB.",
        )

    filename = file.filename or "document"
    logger.info(
        "OCR scan request: file=%s size=%d bytes patient=%s",
        filename, len(file_bytes), patient_id,
    )

    try:
        # ── Upload to S3 ──────────────────────────────────────────
        s3_result = await s3_service.upload_document(
            file_bytes=file_bytes,
            filename=filename,
            content_type=content_type,
            patient_id=patient_id,
        )

        # ── Parse with Textract ───────────────────────────────────
        ocr_result = await textract_service.parse_document(
            file_bytes=file_bytes,
            filename=filename,
            s3_key=s3_result["s3_key"],
        )

        return ocr_result

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        logger.exception("OCR scan failed for file %s", filename)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Document processing failed. Please try again.",
        )
