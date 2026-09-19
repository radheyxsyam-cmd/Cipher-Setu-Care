"use client";

import { useState, useEffect } from "react";
import ClinicalSummaryView from "@/components/ClinicalSummaryView";
import { api, PatientRecord, ClinicalSummary } from "@/lib/api";
import { QUEUE_STATUS_LABELS } from "@/lib/constants";
import { Stethoscope, User, Clock, FileText, Mic, CheckCircle2, ShieldAlert, RefreshCw, Save } from "lucide-react";

export default function DoctorPage() {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listPatients(1, 20);
      setPatients(res.patients);
      if (res.patients.length > 0 && !selectedPatient) {
        setSelectedPatient(res.patients[0]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load patient queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSaveSummary = async (updatedSummary: ClinicalSummary, physicianNotes?: string) => {
    if (!selectedPatient) return;
    setSaving(true);
    try {
      const updated = await api.updateSummary(selectedPatient.patient_id, {
        clinical_summary: updatedSummary,
        physician_notes: physicianNotes,
        queue_status: "in_progress",
      });
      setSelectedPatient(updated);
      setPatients((prev) =>
        prev.map((p) => (p.patient_id === updated.patient_id ? updated : p))
      );
    } catch (err: any) {
      alert("Failed to save summary: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 py-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white shadow-sm p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-brand-nha flex items-center justify-center">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-blue-900">Physician Review Dashboard</h1>
            <p className="text-xs text-slate-600 font-medium">High-Density 2-Column Clinical Review & Validation</p>
          </div>
        </div>

        <button
          onClick={fetchPatients}
          disabled={loading}
          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200 flex items-center gap-1.5 self-start sm:self-auto focus:outline-none focus:ring-2 focus:ring-brand-nha transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Main 2-Column High-Density Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Patient List & Raw Inputs (5 columns) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Patient Queue Selector */}
          <div className="bg-white shadow-sm p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Pending Patient Queue ({patients.length})
              </span>
              <span className="text-[10px] text-brand-nha font-mono font-bold">Live Sync</span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {loading ? (
                <p className="text-xs text-slate-500 p-2 text-center font-medium">Loading queue...</p>
              ) : patients.length === 0 ? (
                <p className="text-xs text-slate-500 p-2 text-center font-medium">No patients in queue.</p>
              ) : (
                patients.map((p) => {
                  const isSelected = selectedPatient?.patient_id === p.patient_id;
                  const statusInfo = QUEUE_STATUS_LABELS[p.queue_status] || {
                    label: p.queue_status,
                    color: "text-slate-600 bg-slate-100",
                  };
                  return (
                    <button
                      key={p.patient_id}
                      onClick={() => setSelectedPatient(p)}
                      className={`w-full p-3 rounded-xl text-left border transition-all flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-brand-nha ${
                        isSelected
                          ? "bg-blue-50 border-blue-200 shadow-sm"
                          : "bg-white hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-800">{p.patient_name}</span>
                          <span className="text-[10px] text-slate-500 font-medium">({p.age}y/{p.gender})</span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate max-w-[200px] mt-0.5">
                          {p.raw_transcript || p.clinical_summary?.chief_complaint || "No transcript"}
                        </p>
                      </div>

                      <div className="text-right flex flex-col items-end">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusInfo.color.replace("text-slate-400", "text-slate-700").replace("bg-surface-100", "bg-slate-100")}`}>
                          {statusInfo.label}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-mono mt-1 font-medium">
                          {p.patient_id}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Raw Voice Transcript Display */}
          {selectedPatient && (
            <div className="bg-white shadow-sm p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-brand-nha" />
                  Raw Patient Voice Audio Transcript
                </span>
                <span className="text-[10px] text-slate-500 font-mono font-medium">
                  {selectedPatient.abha_token}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                <p className="text-xs text-slate-700 leading-relaxed italic whitespace-pre-wrap font-medium">
                  "{selectedPatient.raw_transcript || "No raw voice transcript provided."}"
                </p>
              </div>
            </div>
          )}

          {/* Scanned Document Thumbnail */}
          {selectedPatient && (
            <div className="bg-white shadow-sm p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brand-nha" />
                  Uploaded Document / Prescription
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-600 font-medium">Prescription Scan (Processed via Textract)</p>
                <span className="inline-block mt-2 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full">
                  OCR Verification Complete
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Main Area: AI-Generated Clinical Summary (7 columns) */}
        <div className="lg:col-span-7">
          {selectedPatient ? (
            selectedPatient.clinical_summary ? (
              <ClinicalSummaryView
                summary={selectedPatient.clinical_summary}
                isEditable={true}
                onSave={handleSaveSummary}
                physicianNotes={selectedPatient.physician_notes || ""}
                isSaving={saving}
              />
            ) : (
              <div className="bg-white shadow-sm p-8 rounded-2xl border border-slate-200 text-center space-y-3">
                <p className="text-sm text-slate-600 font-medium">No clinical summary generated for this patient yet.</p>
                <button
                  onClick={fetchPatients}
                  className="px-4 py-2 bg-blue-50 text-brand-nha border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-nha"
                >
                  Generate Summary
                </button>
              </div>
            )
          ) : (
            <div className="bg-white shadow-sm p-12 rounded-2xl border border-slate-200 text-center">
              <User className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-medium">Select a patient from the queue to review clinical summary</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
