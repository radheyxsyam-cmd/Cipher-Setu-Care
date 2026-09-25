# SETU-Care 🏥

**A production-ready, AI-powered healthcare clinical intake and rural care coordination platform.**

---

## 📋 Overview

SETU-Care addresses two critical healthcare infrastructure problems in India:

1. **Hospital Intake Bottleneck**: Converts multi-lingual patient voice inputs and scanned prescriptions into physician-ready structured clinical summaries using the SOCRATES framework (Chief Complaint, HPI, Past History, Vitals, Medications).

2. **Care Continuity**: Tracks referrals, queues, and longitudinal patient health records aligned to ABHA/ABDM standards.

---

## 🏗️ Architecture


```text
┌─────────────────────────────────────────────────────┐
│                 AWS Amplify (Frontend)               │
│  Next.js 14 + TypeScript + Tailwind CSS              │
│  ├── /kiosk    → Multimodal Voice + Document Intake  │
│  ├── /doctor   → Physician Review Dashboard           │
│  └── /rural    → Referral & Queue Management         │
└─────────────────────┬───────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────┐
│              Render (FastAPI Backend)                │
│  Python 3.11 + Pydantic v2                           │
│  ├── Amazon Transcribe         → Multilingual Voice  │
│  ├── Amazon Textract           → Prescription OCR    │
│  ├── Google Gemini AI          → Clinical NLP Fusion │
│  ├── Amazon DynamoDB           → Patient Records     │
│  └── Amazon S3                 → Document Storage    │
└─────────────────────────────────────────────────────┘
*Note: Backend was initially tested on AWS App Runner but moved to Render for optimized WebSocket audio streaming.*

---

## 🚀 Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- AWS CLI (optional — app runs in MOCK_MODE without credentials)

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate      # macOS/Linux
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Set MOCK_MODE=true for local testing without AWS

uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
```

App: http://localhost:3000

---

## ☁️ AWS Deployment

### Backend → AWS App Runner / Render(used for now as AWS App Runner Iwas facing issue)

```bash
cd backend

# Build and push Docker image to ECR
aws ecr create-repository --repository-name setu-care-backend
docker build -t setu-care-backend .
docker tag setu-care-backend:latest <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/setu-care-backend:latest
docker push <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/setu-care-backend:latest

# Deploy via App Runner (using apprunner.yaml)
aws apprunner create-service --cli-input-json file://apprunner-config.json
```

### Frontend → AWS Amplify

1. Push repository to GitHub
2. Connect GitHub repo to AWS Amplify Console
3. Set environment variables in Amplify Console:
   - `NEXT_PUBLIC_API_URL` → Your App Runner service URL
4. Amplify auto-deploys on every push using `amplify.yml`

---

## 🔒 Security

| Control | Implementation |
|---|---|
| **Zero credential leak** | All secrets via `.env` — never committed to Git |
| **CORS lockdown** | `FRONTEND_ORIGIN` env var — no wildcard `*` allowed |
| **Input sanitization** | Pydantic v2 strict schemas with length/pattern validators |
| **File upload safety** | MIME type validation + 5MB size limit before S3 upload |
| **Identity privacy** | ABHA IDs use synthetic placeholders (`ABHA-TEST-XXXX`) |
| **Aadhaar compliance** | Rendered as `[Aadhaar Redacted]` — never stored raw |
| **TLS everywhere** | App Runner + Amplify enforce HTTPS |
| **Offline mock mode** | `MOCK_MODE=true` — full local dev without real AWS |

---

## 📁 Project Structure

```
```text
setu-care/
├── .gitignore
├── README.md
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing / Mode Selection
│   │   │   ├── kiosk/page.tsx        # Voice Intake & Document Scan
│   │   │   ├── doctor/page.tsx       # Physician Review Dashboard
│   │   │   └── rural/page.tsx        # Referral & Queue Tracking
│   │   ├── components/
│   │   │   ├── VoiceRecorder.tsx
│   │   │   ├── DocumentScanner.tsx
│   │   │   ├── ClinicalSummaryView.tsx
│   │   │   └── Navbar.tsx
│   │   └── lib/
│   │       ├── api.ts
│   │       └── constants.ts
│   ├── package.json
│   ├── tailwind.config.js
│   └── amplify.yml
└── backend/
    ├── app/
    │   ├── main.py
    │   ├── config.py
    │   ├── services/
    │   │   ├── transcribe_service.py # AWS Transcribe audio handling
    │   │   ├── textract_service.py   # AWS Textract OCR logic
    │   │   ├── gemini_service.py     # Google Gemini clinical NLP
    │   │   ├── dynamodb_service.py   
    │   │   └── s3_service.py
    │   ├── routes/
    │   │   ├── intake.py
    │   │   ├── ocr.py
    │   │   ├── doctor.py
    │   │   └── rural.py
    │   └── schemas/
    │       └── patient.py
    ├── requirements.txt
    ├── Dockerfile
    └── .env.example

---

## 🧪 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `POST` | `/api/v1/intake/process` | Process voice transcript → clinical summary |
| `GET` | `/api/v1/intake/queue` | Pending patient queue |
| `POST` | `/api/v1/ocr/scan` | Upload document → OCR extraction |
| `GET` | `/api/v1/doctor/patients` | Paginated patient list |
| `GET` | `/api/v1/doctor/patient/{id}` | Full patient record |
| `PUT` | `/api/v1/doctor/patient/{id}/summary` | Save edited summary |
| `GET` | `/api/v1/rural/queue` | PHC queue |
| `POST` | `/api/v1/rural/referral` | Create referral |
| `GET` | `/api/v1/rural/referrals` | Active referrals |

---

## ⚠️ Compliance Notes

- This application handles sensitive health data. Ensure production deployment complies with:
  - **DPDP Act 2023** (India Digital Personal Data Protection)
  - **ABDM / ABHA Standards** (Ayushman Bharat Digital Mission)
  - **IT Act 2000 Section 43A** (Reasonable security practices for sensitive personal data)
- All ABHA IDs in this demo use synthetic test placeholders (`ABHA-TEST-XXXX`)
- Real patient data must be encrypted at rest (DynamoDB encryption enabled) and in transit (HTTPS enforced)

---

## 📄 License

MIT License — See LICENSE file for details.
