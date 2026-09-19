"""
SETU-Care FastAPI Application Entry Point
Configures CORS, routers, middleware, and global exception handling.
"""
import logging
import time
import uuid
import json
import os
from dotenv import load_dotenv

# Load environment variables from .env file BEFORE starting the AI
load_dotenv()

from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from google import genai

from app.config import get_settings
from app.routes import doctor, intake, ocr, rural

# ── Logging Setup & Config ────────────────────────────────────────
settings = get_settings()

logging.basicConfig(
    level=getattr(logging, settings.log_level, "INFO"),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# ── Gemini Client & Schemas ───────────────────────────────────────
# It will now automatically find GEMINI_API_KEY from your .env file
gemini_client = genai.Client()

class IntakeData(BaseModel):
    medications: list
    lab_values: list
    transcript: str

# ── FastAPI App ───────────────────────────────────────────────────
app = FastAPI(
    title="SETU-Care Clinical API",
    description=(
        "AI-powered multimodal clinical intake and rural care coordination platform. "
        "Converts voice transcripts and scanned documents into structured clinical summaries."
    ),
    version="1.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    openapi_url="/openapi.json" if not settings.is_production else None,
)

# ── CORS (Strict — no wildcard) ───────────────────────────────────
allowed_origins = [settings.frontend_origin]
if not settings.is_production:
    allowed_origins.extend([
        "http://localhost:3000",
        "http://localhost:3001",
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID", "X-Process-Time"],
    max_age=3600,
)

# ── Request ID + Timing Middleware ────────────────────────────────
@app.middleware("http")
async def add_request_metadata(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    start = time.perf_counter()
    response = await call_next(request)
    process_ms = round((time.perf_counter() - start) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{process_ms}ms"
    return response

# ── Global Exception Handler ──────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again."},
    )

# ── Routers ───────────────────────────────────────────────────────
PREFIX = "/api/v1"

app.include_router(intake.router, prefix=PREFIX, tags=["Clinical Intake"])
app.include_router(ocr.router, prefix=PREFIX, tags=["Document OCR"])
app.include_router(doctor.router, prefix=PREFIX, tags=["Physician Dashboard"])
app.include_router(rural.router, prefix=PREFIX, tags=["Rural Care & Referrals"])

# ── AI Data Fusion Endpoint (Gemini) ──────────────────────────────
@app.post(
    "/api/analyze-intake", 
    tags=["AI Clinical Analysis"],
    summary="AI Data Fusion (Google Gemini)",
    description="Synthesizes voice symptoms and scanned documents for drug interactions and clinical next steps using Google Gemini 3.6 Flash."
)
async def analyze_clinical_data(data: IntakeData):
    prompt_text = f"""
    You are an expert clinical AI assistant. Review the following patient intake data:
    
    Reported Symptoms (Voice Transcript): {data.transcript}
    Extracted Medications (OCR): {data.medications}
    Flagged Lab Values (OCR): {data.lab_values}
    
    Please provide:
    1. A brief 2-3 sentence Clinical Summary.
    2. Any potential interactions between the symptoms and current medications.
    3. Recommended next steps for the physician.
    """

    try:
        response = gemini_client.models.generate_content(
            model='gemini-3.6-flash',
            contents=prompt_text
        )
        ai_summary = response.text
        
        return {"summary": ai_summary}

    except Exception as e:
        logger.error(f"Gemini Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
# ── Health Check ──────────────────────────────────────────────────
@app.get("/health", tags=["System"], summary="Service health check")
async def health_check():
    return {
        "status": "ok",
        "version": "1.0.0",
        "environment": settings.app_env,
        "mock_mode": settings.mock_mode,
        "region": settings.aws_region,
    }

# ── Root ──────────────────────────────────────────────────────────
@app.get("/", tags=["System"], summary="API root")
async def root():
    return {
        "service": "SETU-Care Clinical API",
        "docs": "/docs",
        "health": "/health",
    }
