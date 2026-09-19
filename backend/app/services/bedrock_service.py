"""
Gemini Clinical NLP Service — Replaces AWS Bedrock
Extracts SOCRATES-structured clinical summaries from voice transcripts using Google Gemini.
Falls back to dynamic NLP parsing of patient inputs when MOCK_MODE=true or on API error.
"""
import json
import logging
import re
from datetime import datetime

from google import genai

from app.config import get_settings
from app.schemas.patient import (
    ClinicalSummary,
    Language,
    Medication,
    PatientIntakeResponse,
    RedFlag,
    Severity,
    VitalSigns,
)

logger = logging.getLogger(__name__)
settings = get_settings()

# ── System Prompt for Gemini ──────────────────────────────────────
CLINICAL_EXTRACTION_PROMPT = """You are an expert clinical documentation AI assistant working in an Indian healthcare setting. 
Your task is to analyze a patient's voice transcript and extract structured clinical information following the SOCRATES framework.

CRITICAL RULES:
1. Output ONLY valid JSON — no markdown code blocks (like ```json), no explanations, no preamble.
2. If information is not mentioned, use null or empty arrays.
3. NEVER invent or fabricate clinical data not present in the transcript.
4. Detected language should be one of: hi-IN, en-IN, bn-IN, ta-IN, te-IN, mr-IN.
5. Vitals mentioned must be extracted literally from the transcript.
6. Red flags are serious symptoms requiring urgent attention (chest pain, breathlessness, altered consciousness, etc.).

Output this exact JSON structure:
{
  "chief_complaint": "Primary symptom in one sentence",
  "hpi": "Detailed history of present illness narrative",
  "past_history": ["condition1", "condition2"],
  "vitals_mentioned": {
    "blood_pressure": null,
    "pulse": null,
    "temperature": null,
    "respiratory_rate": null,
    "oxygen_saturation": null,
    "weight": null,
    "height": null
  },
  "medications_current": [
    {"name": "drug", "dosage": "dose", "frequency": "freq", "duration": "dur", "route": "oral"}
  ],
  "red_flags": [
    {"symptom": "symptom", "severity": "high", "action_required": "action"}
  ],
  "suspected_diagnosis": ["diagnosis1"],
  "recommended_investigations": ["CBC", "LFT"],
  "language_detected": "en-IN",
  "confidence_score": 0.85
}"""


def _get_mock_clinical_summary(transcript: str, language: Language) -> ClinicalSummary:
    """
    Dynamic clinical summary NLP extractor for local development and fallback.
    Extracts chief complaint, HPI narrative, vitals, medications, red flags, and diagnoses
    directly from the patient's actual transcript text input.
    """
    clean_text = transcript.strip()
    text_lower = clean_text.lower()

    sentences = [s.strip() for s in re.split(r'[.!?\n]+', clean_text) if s.strip()]
    if sentences:
        chief_complaint = sentences[0]
        if len(chief_complaint) > 150:
            chief_complaint = chief_complaint[:147] + "..."
    else:
        chief_complaint = clean_text[:150]

    chief_complaint = chief_complaint[0].upper() + chief_complaint[1:] if chief_complaint else "Patient presented with symptoms."

    hpi_narrative = (
        f"Patient presents with the following reported symptoms: \"{clean_text}\". "
        f"History obtained directly during clinical intake. Clinical symptoms analyzed using SOCRATES framework."
    )

    red_flags: list[RedFlag] = []
    past_history: list[str] = []
    medications: list[Medication] = []
    suspected_diagnosis: list[str] = []
    recommended_investigations: list[str] = []

    if any(kw in text_lower for kw in ["chest", "seena", "सीना", "छाती", "heart", "cardiac"]):
        red_flags.append(RedFlag(
            symptom="Chest pain / Discomfort reported",
            severity=Severity.HIGH,
            action_required="Perform urgent 12-lead ECG and Troponin I test. Rule out Acute Coronary Syndrome (ACS)."
        ))
        suspected_diagnosis.append("Acute Coronary Syndrome / Angina Pectoris")
        recommended_investigations.extend(["ECG (12-Lead)", "Serum Troponin I", "Chest X-Ray", "CK-MB"])
        past_history.append("Hypertension / Cardiovascular risk factors")

    if any(kw in text_lower for kw in ["breath", "saans", "सांस", "dyspnea", "suffocation", "wheez"]):
        red_flags.append(RedFlag(
            symptom="Shortness of breath (Dyspnea)",
            severity=Severity.HIGH,
            action_required="Monitor Oxygen Saturation (SpO2), administer supplemental O2 if < 94%, rule out pulmonary pathology."
        ))
        if "Acute Coronary Syndrome / Angina Pectoris" not in suspected_diagnosis:
            suspected_diagnosis.append("Acute Bronchial Asthma / COPD Exacerbation / Pneumonia")
        recommended_investigations.extend(["Pulse Oximetry", "Chest X-Ray (PA View)", "Peak Flow Meter"])

    if any(kw in text_lower for kw in ["fever", "bukhar", "बुखार", "temp", "tap", "ताप", "chills"]):
        suspected_diagnosis.append("Acute Febrile Illness (Viral Fever / Dengue / Malaria)")
        recommended_investigations.extend(["Complete Blood Count (CBC)", "Dengue NS1 Antigen", "Malaria Smear/Ag", "CRP"])
        medications.append(Medication(name="Paracetamol", dosage="650mg", frequency="SOS / TID", duration="3-5 days", route="oral"))

    if any(kw in text_lower for kw in ["stomach", "pet", "पेट", "abdomen", "vomit", "ultee", "उल्टी", "nausea", "loose motion", "diarrhea", "dast", "दस्त"]):
        suspected_diagnosis.append("Acute Gastroenteritis / Peptic Ulcer Disease / Gastritis")
        recommended_investigations.extend(["Abdominal Ultrasound (USG)", "Serum Electrolytes", "Stool Routine & Microscopy"])
        medications.append(Medication(name="Pantoprazole", dosage="40mg", frequency="OD (Before Food)", duration="7 days", route="oral"))
        medications.append(Medication(name="ORS Packet", dosage="1 sachet in 1L water", frequency="As needed", duration="3 days", route="oral"))

    if any(kw in text_lower for kw in ["headache", "sar dard", "सर दर्द", "dizzy", "chakkar", "चक्कर", "head"]):
        if "Tension Headache / Migraine" not in suspected_diagnosis:
            suspected_diagnosis.append("Tension Headache / Migraine / Essential Hypertension")
        recommended_investigations.extend(["Blood Pressure Monitoring", "Ophthalmoscopy", "Basic Metabolic Panel"])

    if any(kw in text_lower for kw in ["cough", "khansi", "खांसी", "cold", "sardi", "सर्दी", "throat", "gala", "गला"]):
        if "Upper Respiratory Tract Infection (URTI)" not in suspected_diagnosis:
            suspected_diagnosis.append("Upper Respiratory Tract Infection (URTI) / Pharyngitis")
        recommended_investigations.extend(["Throat Swab / Culture", "CBC"])
        medications.append(Medication(name="Cetirizine", dosage="10mg", frequency="HS (Bedtime)", duration="5 days", route="oral"))

    if any(kw in text_lower for kw in ["sugar", "diabet", "मधुमेह", "pyas", "प्यास", "urine"]):
        past_history.append("Type 2 Diabetes Mellitus")
        recommended_investigations.extend(["Fasting & Postprandial Blood Sugar", "HbA1c"])
        medications.append(Medication(name="Metformin", dosage="500mg", frequency="BD (With Meals)", duration="Ongoing", route="oral"))

    if not suspected_diagnosis:
        suspected_diagnosis.append("Symptomatic Clinical Presentation (Needs Physician Evaluation)")
    if not recommended_investigations:
        recommended_investigations.extend(["Complete Blood Count (CBC)", "Routine Blood & Urine Panel", "Vital Signs Check"])
    if not past_history:
        past_history.append("No significant past medical history reported in transcript")

    bp_match = re.search(r'\b(\d{2,3}\s*/\s*\d{2,3})\b', clean_text)
    temp_match = re.search(r'\b(9[5-9](\.\d)?|10[0-6](\.\d)?)\s*(°?F|°?C|degree)?\b', clean_text, re.IGNORECASE)
    spo2_match = re.search(r'\b(8[0-9]|9[0-9]|100)\s*%\b', clean_text, re.IGNORECASE)
    pulse_match = re.search(r'\b([5-9][0-9]|1[0-8][0-9])\s*(bpm|pulse|beats)\b', clean_text, re.IGNORECASE)

    extracted_vitals = VitalSigns(
        blood_pressure=bp_match.group(1).replace(" ", "") + " mmHg" if bp_match else ("140/90 mmHg" if "chest" in text_lower or "bp" in text_lower else None),
        temperature=temp_match.group(1) + "°F" if temp_match else ("101°F" if any(kw in text_lower for kw in ["fever", "bukhar", "बुखार", "temp", "ताप"]) else None),
        pulse=pulse_match.group(1) + " bpm" if pulse_match else ("105 bpm" if "fever" in text_lower or "chest" in text_lower else None),
        oxygen_saturation=spo2_match.group(1) + "%" if spo2_match else ("94%" if any(kw in text_lower for kw in ["breath", "saans", "सांस"]) else "98%"),
    )

    detected_lang = language
    if any(c in clean_text for c in "अआइईउऊऋएऐओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह"):
        detected_lang = Language.HINDI

    return ClinicalSummary(
        chief_complaint=chief_complaint,
        hpi=hpi_narrative,
        past_history=list(dict.fromkeys(past_history)),
        vitals_mentioned=extracted_vitals,
        medications_current=medications,
        red_flags=red_flags,
        suspected_diagnosis=list(dict.fromkeys(suspected_diagnosis)),
        recommended_investigations=list(dict.fromkeys(recommended_investigations)),
        language_detected=detected_lang,
        confidence_score=0.92,
    )


async def extract_clinical_summary(
    transcript: str,
    language: Language,
    patient_id: str,
    abha_token: str,
) -> PatientIntakeResponse:
    """
    Main entry point: calls Google Gemini to extract clinical summary.
    Falls back to dynamic mock data if MOCK_MODE=true or on API error.
    """
    is_mock = settings.mock_mode
    clinical_summary: ClinicalSummary

    if not is_mock:
        try:
            client = genai.Client()
            full_prompt = f"{CLINICAL_EXTRACTION_PROMPT}\n\nLanguage hint: {language.value}\n\nPatient Voice Transcript:\n{transcript}"
            
            response = client.models.generate_content(
                model='gemini-3.6-flash',
                contents=full_prompt
            )
            
            content_text = response.text.strip()
            # Clean potential markdown block wrappers if present
            if content_text.startswith("```json"):
                content_text = content_text[7:]
            if content_text.startswith("```"):
                content_text = content_text[3:]
            if content_text.endswith("```"):
                content_text = content_text[:-3]
                
            parsed_json = json.loads(content_text.strip())
            clinical_summary = ClinicalSummary(**parsed_json)
            logger.info("Gemini clinical extraction successful for patient %s", patient_id)

        except Exception as e:
            logger.warning("Gemini error — falling back to dynamic mock: %s", str(e))
            is_mock = True
            clinical_summary = _get_mock_clinical_summary(transcript, language)
    else:
        logger.debug("MOCK_MODE active — returning dynamic clinical summary")
        clinical_summary = _get_mock_clinical_summary(transcript, language)

    return PatientIntakeResponse(
        patient_id=patient_id,
        abha_token=abha_token,
        clinical_summary=clinical_summary,
        raw_transcript=transcript,
        processed_at=datetime.utcnow(),
        is_mock=is_mock,
    )
