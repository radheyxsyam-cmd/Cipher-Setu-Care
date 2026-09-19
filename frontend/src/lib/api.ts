// Typed API client for SETU-Care frontend
// All requests go through NEXT_PUBLIC_API_URL — never hardcoded endpoints

import { API_BASE_URL } from "./constants";

// ── Types ──────────────────────────────────────────────────────────
export interface VitalSigns {
  blood_pressure?: string;
  pulse?: string;
  temperature?: string;
  respiratory_rate?: string;
  oxygen_saturation?: string;
  weight?: string;
  height?: string;
}

export interface RedFlag {
  symptom: string;
  severity: "low" | "moderate" | "high" | "critical";
  action_required: string;
}

export interface Medication {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  route?: string;
}

export interface LabValue {
  test_name: string;
  value: string;
  unit?: string;
  reference_range?: string;
  is_abnormal: boolean;
  abnormal_direction?: string;
}

export interface ClinicalSummary {
  chief_complaint: string;
  hpi: string;
  past_history: string[];
  vitals_mentioned: VitalSigns;
  medications_current: Medication[];
  red_flags: RedFlag[];
  suspected_diagnosis: string[];
  recommended_investigations: string[];
  language_detected: string;
  confidence_score: number;
}

export interface PatientIntakeRequest {
  transcript: string;
  language: string;
  abha_token: string;
  patient_name: string;
  age?: number;
  gender?: string;
  facility_id?: string;
}

export interface PatientIntakeResponse {
  patient_id: string;
  abha_token: string;
  clinical_summary: ClinicalSummary;
  raw_transcript: string;
  processed_at: string;
  is_mock: boolean;
}

export interface OCRResponse {
  document_id: string;
  s3_key: string;
  filename: string;
  extracted_medications: Medication[];
  lab_values: LabValue[];
  raw_text: string;
  abnormal_flags: string[];
  confidence_score: number;
  processed_at: string;
  is_mock: boolean;
}

export interface PatientRecord {
  patient_id: string;
  abha_token: string;
  patient_name: string;
  age?: number;
  gender?: string;
  facility_id?: string;
  queue_status: string;
  clinical_summary?: ClinicalSummary;
  raw_transcript?: string;
  physician_notes?: string;
  referral_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface PatientListResponse {
  patients: PatientRecord[];
  total: number;
  page: number;
  page_size: number;
}

export interface QueueEntry {
  patient_id: string;
  patient_name: string;
  abha_token: string;
  queue_status: string;
  arrival_time: string;
  estimated_wait_minutes?: number;
  chief_complaint?: string;
  severity: string;
  facility_id?: string;
}

export interface ReferralRequest {
  patient_id: string;
  referral_type: "district_hospital" | "tele_consultation" | "specialist";
  reason: string;
  destination_facility?: string;
  urgency: string;
  referring_physician?: string;
  notes?: string;
}

export interface ReferralRecord {
  referral_id: string;
  patient_id: string;
  referral_type: string;
  reason: string;
  destination_facility?: string;
  urgency: string;
  referring_physician?: string;
  status: string;
  created_at: string;
}

export interface RuralStats {
  total_patients_today: number;
  waiting: number;
  in_progress: number;
  active_referrals: number;
  completed_today: number;
}

// ── API Client ─────────────────────────────────────────────────────
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Request failed: ${res.status}`);
    }
    return res.json();
  }

  // ── Intake ──────────────────────────────────────────────────────
  async processIntake(data: PatientIntakeRequest): Promise<PatientIntakeResponse> {
    return this.request<PatientIntakeResponse>("/api/v1/intake/process", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getQueue(facilityId?: string): Promise<QueueEntry[]> {
    const qs = facilityId ? `?facility_id=${facilityId}` : "";
    return this.request<QueueEntry[]>(`/api/v1/intake/queue${qs}`);
  }

  // ── OCR ─────────────────────────────────────────────────────────
  async scanDocument(file: File, patientId?: string): Promise<OCRResponse> {
    const form = new FormData();
    form.append("file", file);
    if (patientId) form.append("patient_id", patientId);
    const res = await fetch(`${this.baseUrl}/api/v1/ocr/scan`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `OCR failed: ${res.status}`);
    }
    return res.json();
  }

  // ── Doctor ──────────────────────────────────────────────────────
  async listPatients(
    page = 1,
    pageSize = 20,
    statusFilter?: string
  ): Promise<PatientListResponse> {
    let qs = `?page=${page}&page_size=${pageSize}`;
    if (statusFilter) qs += `&status_filter=${statusFilter}`;
    return this.request<PatientListResponse>(`/api/v1/doctor/patients${qs}`);
  }

  async getPatient(patientId: string): Promise<PatientRecord> {
    return this.request<PatientRecord>(`/api/v1/doctor/patient/${patientId}`);
  }

  async updateSummary(
    patientId: string,
    data: { clinical_summary: ClinicalSummary; physician_notes?: string; queue_status?: string }
  ): Promise<PatientRecord> {
    return this.request<PatientRecord>(
      `/api/v1/doctor/patient/${patientId}/summary`,
      { method: "PUT", body: JSON.stringify(data) }
    );
  }

  // ── Rural ───────────────────────────────────────────────────────
  async getRuralQueue(facilityId?: string): Promise<QueueEntry[]> {
    const qs = facilityId ? `?facility_id=${facilityId}` : "";
    return this.request<QueueEntry[]>(`/api/v1/rural/queue${qs}`);
  }

  async createReferral(data: ReferralRequest): Promise<ReferralRecord> {
    return this.request<ReferralRecord>("/api/v1/rural/referral", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async listReferrals(): Promise<ReferralRecord[]> {
    return this.request<ReferralRecord[]>("/api/v1/rural/referrals");
  }

  async getRuralStats(): Promise<RuralStats> {
    return this.request<RuralStats>("/api/v1/rural/stats");
  }

  async healthCheck(): Promise<{ status: string; mock_mode: boolean }> {
    return this.request("/health");
  }
}

export const api = new ApiClient(API_BASE_URL);
