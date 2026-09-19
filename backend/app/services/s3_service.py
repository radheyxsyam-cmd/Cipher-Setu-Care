"""
Amazon S3 Service — Secure Document Asset Storage
Validates MIME type and size before upload.
Generates pre-signed URLs for secure frontend display.
Falls back to mock key generation when MOCK_MODE=true.
"""
import logging
import mimetypes
import uuid
from datetime import datetime

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Allowed MIME Types ────────────────────────────────────────────
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "application/pdf"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}


def _validate_upload(file_bytes: bytes, content_type: str, filename: str) -> None:
    """Validate file size and MIME type. Raises ValueError on failure."""
    if len(file_bytes) > settings.max_upload_size_bytes:
        raise ValueError(
            f"File size ({len(file_bytes) / 1024 / 1024:.1f}MB) "
            f"exceeds maximum allowed size of {settings.max_upload_size_mb}MB."
        )
    if content_type not in ALLOWED_MIME_TYPES:
        raise ValueError(
            f"File type '{content_type}' is not allowed. "
            f"Accepted types: JPEG, PNG, PDF."
        )
    # Double-check extension
    import os
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"File extension '{ext}' is not allowed.")


def _build_s3_client():
    kwargs = {"region_name": settings.aws_region}
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        kwargs["aws_access_key_id"] = settings.aws_access_key_id
        kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
    return boto3.client("s3", **kwargs)


async def upload_document(
    file_bytes: bytes,
    filename: str,
    content_type: str,
    patient_id: str = "unknown",
) -> dict:
    """
    Upload medical document to S3.
    Returns: {"s3_key": str, "presigned_url": str | None, "size_bytes": int}
    Falls back to mock response when MOCK_MODE=true.
    """
    _validate_upload(file_bytes, content_type, filename)

    document_id = str(uuid.uuid4())[:8].upper()
    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    s3_key = f"documents/{patient_id}/{timestamp}-{document_id}-{filename}"

    if settings.mock_mode:
        logger.debug("MOCK_MODE: simulating S3 upload for %s", filename)
        return {
            "s3_key": s3_key,
            "presigned_url": None,  # No real URL in mock mode
            "size_bytes": len(file_bytes),
            "document_id": document_id,
            "is_mock": True,
        }

    try:
        client = _build_s3_client()
        client.put_object(
            Bucket=settings.s3_bucket_name,
            Key=s3_key,
            Body=file_bytes,
            ContentType=content_type,
            ServerSideEncryption="AES256",  # Encryption at rest
            Metadata={
                "patient-id": patient_id,
                "upload-timestamp": timestamp,
                "document-id": document_id,
            },
        )
        # Generate pre-signed URL valid for 1 hour
        presigned_url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.s3_bucket_name, "Key": s3_key},
            ExpiresIn=3600,
        )
        logger.info("S3 upload successful: %s (%d bytes)", s3_key, len(file_bytes))
        return {
            "s3_key": s3_key,
            "presigned_url": presigned_url,
            "size_bytes": len(file_bytes),
            "document_id": document_id,
            "is_mock": False,
        }
    except (BotoCoreError, ClientError) as e:
        logger.error("S3 upload error: %s", str(e))
        raise
