"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Activity,
  Pill,
  CheckCircle2,
  FileSpreadsheet,
  Copy,
  Check,
  Edit3,
  Save,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { ClinicalSummary } from "@/lib/api";

interface ClinicalSummaryViewProps {
  summary: ClinicalSummary;
  isEditable?: boolean;
  onSave?: (updatedSummary: ClinicalSummary, physicianNotes?: string) => void;
  physicianNotes?: string;
  isSaving?: boolean;
}

export default function ClinicalSummaryView({
  summary: initialSummary,
  isEditable = false,
  onSave,
  physicianNotes: initialNotes = "",
  isSaving = false,
}: ClinicalSummaryViewProps) {
  const [summary, setSummary] = useState<ClinicalSummary>(initialSummary);
  const [physicianNotes, setPhysicianNotes] = useState(initialNotes);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const copySummaryText = () => {
    const text = `
SOCRATES CLINICAL SUMMARY
-------------------------
Chief Complaint: ${summary.chief_complaint}

HPI:
${summary.hpi}

Vitals:
BP: ${summary.vitals_mentioned.blood_pressure || "N/A"} | Pulse: ${summary.vitals_mentioned.pulse || "N/A"} | Temp: ${summary.vitals_mentioned.temperature || "N/A"} | SpO2: ${summary.vitals_mentioned.oxygen_saturation || "N/A"}

Red Flags:
${summary.red_flags.map((rf) => `- ${rf.symptom} (${rf.severity.toUpperCase()}): ${rf.action_required}`).join("\n") || "None detected"}

Suspected Diagnosis:
${summary.suspected_diagnosis.join(", ") || "N/A"}

Recommended Investigations:
${summary.recommended_investigations.join(", ") || "N/A"}
`.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(summary, physicianNotes);
      setIsEditing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 space-y-6 border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand-nha flex items-center justify-center border border-blue-100">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              SOCRATES Clinical Summary
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                AI Generated
              </span>
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Gemini NLP Structured (Confidence: {Math.round(summary.confidence_score * 100)}%)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={copySummaryText}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied!" : "Copy Summary"}</span>
          </button>

          {isEditable && (
            <button
              onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
              disabled={isSaving}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-brand-orange ${
                isEditing
                  ? "bg-brand-orange hover:bg-orange-600 text-white shadow-sm"
                  : "bg-blue-50 text-brand-nha hover:bg-blue-100 border border-blue-200"
              }`}
            >
              {isEditing ? (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? "Saving..." : "Save Edits"}</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Summary</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Red Flags Alert Banner */}
      {summary.red_flags && summary.red_flags.length > 0 && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-2">
          <div className="flex items-center space-x-2 text-red-700 font-bold text-xs uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" />
            <span>CRITICAL RED FLAGS DETECTED ({summary.red_flags.length})</span>
          </div>
          {summary.red_flags.map((rf, idx) => (
            <div key={idx} className="text-xs text-red-800 flex items-start gap-2 bg-red-100/50 p-2.5 rounded-lg border border-red-100">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
              <div>
                <strong className="text-red-900">{rf.symptom}:</strong> {rf.action_required}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 1. Chief Complaint */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-brand-nha uppercase tracking-wider">
          1. Chief Complaint (CC)
        </label>
        {isEditing ? (
          <input
            type="text"
            value={summary.chief_complaint}
            onChange={(e) => setSummary({ ...summary, chief_complaint: e.target.value })}
            className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 font-semibold focus:outline-none focus:border-brand-nha focus:ring-1 focus:ring-brand-nha"
          />
        ) : (
          <p className="text-sm font-semibold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200">
            {summary.chief_complaint}
          </p>
        )}
      </div>

      {/* 2. History of Present Illness (HPI) */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-brand-nha uppercase tracking-wider">
          2. History of Present Illness (HPI)
        </label>
        {isEditing ? (
          <textarea
            value={summary.hpi}
            onChange={(e) => setSummary({ ...summary, hpi: e.target.value })}
            rows={4}
            className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 font-medium focus:outline-none focus:border-brand-nha focus:ring-1 focus:ring-brand-nha"
          />
        ) : (
          <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed whitespace-pre-wrap font-medium">
            {summary.hpi}
          </p>
        )}
      </div>

      {/* 3. Vitals Mentioned */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-brand-nha uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-brand-nha" />
          3. Vital Signs Mentioned
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Blood Pressure", val: summary.vitals_mentioned.blood_pressure },
            { label: "Pulse Rate", val: summary.vitals_mentioned.pulse },
            { label: "Temperature", val: summary.vitals_mentioned.temperature },
            { label: "Oxygen Saturation", val: summary.vitals_mentioned.oxygen_saturation },
          ].map((vital, i) => (
            <div key={i} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="block text-[11px] font-bold text-slate-500">{vital.label}</span>
              <span className="text-xs font-bold text-slate-800">{vital.val || "Not mentioned"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Medications & Past History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Past History */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2 shadow-sm">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Past Medical History
          </span>
          {summary.past_history.length > 0 ? (
            <ul className="space-y-1">
              {summary.past_history.map((ph, i) => (
                <li key={i} className="text-xs text-slate-700 font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-nha" />
                  {ph}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic font-medium">No past history recorded</p>
          )}
        </div>

        {/* Current Medications */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2 shadow-sm">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Pill className="w-3.5 h-3.5 text-brand-nha" />
            Current Medications
          </span>
          {summary.medications_current.length > 0 ? (
            <ul className="space-y-1.5">
              {summary.medications_current.map((med, i) => (
                <li key={i} className="text-xs text-slate-700 bg-slate-50 p-1.5 rounded-lg flex items-center justify-between border border-slate-200">
                  <span className="font-bold text-slate-800">{med.name}</span>
                  <span className="text-slate-600 font-medium">{med.dosage} • {med.frequency}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic font-medium">No active medications mentioned</p>
          )}
        </div>
      </div>

      {/* 5. Suspected Diagnosis & Investigations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-100 space-y-2">
          <span className="text-xs font-bold text-brand-nha uppercase tracking-wider">
            Suspected Differential Diagnosis
          </span>
          <div className="flex flex-wrap gap-1.5">
            {summary.suspected_diagnosis.map((dx, i) => (
              <span key={i} className="px-2.5 py-1 bg-white border border-blue-200 rounded-lg text-xs font-bold text-brand-nha shadow-sm">
                {dx}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Recommended Lab Investigations
          </span>
          <div className="flex flex-wrap gap-1.5">
            {summary.recommended_investigations.map((inv, i) => (
              <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-sm">
                {inv}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Physician Review Notes (for Doctor page) */}
      {isEditable && (
        <div className="pt-4 border-t border-slate-200 space-y-2">
          <label className="text-xs font-bold text-brand-nha uppercase tracking-wider">
            Physician Notes & Instructions (Saved to DynamoDB)
          </label>
          <textarea
            value={physicianNotes}
            onChange={(e) => setPhysicianNotes(e.target.value)}
            placeholder="Add doctor's clinical remarks, prescription orders, or referral notes here..."
            rows={3}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:border-brand-nha focus:ring-1 focus:ring-brand-nha resize-none shadow-sm"
          />
        </div>
      )}
    </div>
  );
}
