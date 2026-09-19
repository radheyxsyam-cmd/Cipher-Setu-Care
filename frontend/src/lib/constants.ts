// API base URL and route constants for SETU-Care frontend
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const API_ROUTES = {
  PROCESS_INTAKE: "/api/v1/intake/process",
  GET_QUEUE: "/api/v1/intake/queue",
  SCAN_DOCUMENT: "/api/v1/ocr/scan",
  LIST_PATIENTS: "/api/v1/doctor/patients",
  GET_PATIENT: (id: string) => `/api/v1/doctor/patient/${id}`,
  UPDATE_SUMMARY: (id: string) => `/api/v1/doctor/patient/${id}/summary`,
  RURAL_QUEUE: "/api/v1/rural/queue",
  CREATE_REFERRAL: "/api/v1/rural/referral",
  LIST_REFERRALS: "/api/v1/rural/referrals",
  RURAL_STATS: "/api/v1/rural/stats",
  HEALTH: "/health",
} as const;

export const LANGUAGES = [
  { code: "hi-IN", label: "हिंदी", flag: "🇮🇳" },
  { code: "en-IN", label: "English", flag: "🇬🇧" },
  { code: "bn-IN", label: "বাংলা", flag: "🇧🇩" },
  { code: "ta-IN", label: "தமிழ்", flag: "🏳️" },
  { code: "te-IN", label: "తెలుగు", flag: "🏳️" },
  { code: "mr-IN", label: "मराठी", flag: "🏳️" },
] as const;

export const QUEUE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  waiting: { label: "Waiting", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  in_progress: { label: "In Progress", color: "text-teal-400 bg-teal-400/10 border-teal-400/20" },
  completed: { label: "Completed", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  referred: { label: "Referred", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  cancelled: { label: "Cancelled", color: "text-slate-400 bg-slate-400/10 border-slate-400/20" },
};

export const SEVERITY_COLORS: Record<string, string> = {
  low: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  moderate: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  high: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  critical: "text-red-400 bg-red-400/10 border-red-400/20",
};

export const REFERRAL_TYPE_LABELS: Record<string, string> = {
  district_hospital: "District Hospital",
  tele_consultation: "Tele-Consultation",
  specialist: "Specialist Referral",
};

export const MAX_FILE_SIZE_MB = 5;
export const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"];
export const DEMO_ABHA_TOKEN = "ABHA-TEST-9901";
export const DEMO_FACILITY_ID = "PHC-MH-001";
