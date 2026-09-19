"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import VoiceRecorder from "@/components/VoiceRecorder";
import DocumentScanner from "@/components/DocumentScanner";
import ClinicalSummaryView from "@/components/ClinicalSummaryView";
import { api, ClinicalSummary, OCRResponse } from "@/lib/api";
import { DEMO_ABHA_TOKEN, DEMO_FACILITY_ID } from "@/lib/constants";
import { Activity, ShieldCheck, CheckCircle2, ArrowRight, AlertTriangle, Sparkles, BrainCircuit } from "lucide-react";

export default function KioskPage() {
  const router = useRouter();

  // Patient Demographic Form State
  const [patientName, setPatientName] = useState("Rajesh Kumar");
  const [age, setAge] = useState<number>(52);
  const [gender, setGender] = useState("Male");
  const [abhaToken, setAbhaToken] = useState(DEMO_ABHA_TOKEN);

  // Processing state
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isScanningDoc, setIsScanningDoc] = useState(false);
  const [clinicalSummary, setClinicalSummary] = useState<ClinicalSummary | null>(null);
  const [ocrData, setOcrData] = useState<OCRResponse | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New states for AI Data Fusion
  const [rawTranscript, setRawTranscript] = useState<string>("");
  const [fusionSummary, setFusionSummary] = useState<string | null>(null);
  const [isFusing, setIsFusing] = useState(false);

  // Handle Voice Processing
  const handleTranscriptComplete = async (transcript: string, language: string) => {
    setIsProcessingVoice(true);
    setError(null);
    setRawTranscript(transcript); // Save raw transcript for the prompt
    
    try {
      const response = await api.processIntake({
        transcript,
        language,
        abha_token: abhaToken,
        patient_name: patientName,
        age,
        gender,
        facility_id: DEMO_FACILITY_ID,
      });
      setClinicalSummary(response.clinical_summary);
      setSubmittedId(response.patient_id);
    } catch (err: any) {
      setError(err.message || "Failed to process voice intake.");
    } finally {
      setIsProcessingVoice(false);
    }
  };

  // Handle Document OCR Scan
  const handleScanFile = async (file: File) => {
    setIsScanningDoc(true);
    setError(null);
    try {
      const result = await api.scanDocument(file, submittedId || "PT-DEMO");
      setOcrData(result);
    } catch (err: any) {
      setError(err.message || "Failed to process document with Textract.");
    } finally {
      setIsScanningDoc(false);
    }
  };

  // Trigger  Data Fusion
  const handleGenerateFusionSummary = async () => {
    setIsFusing(true);
    setError(null);
    
    try {
      // Map OCR data into simple arrays for the AI prompt
      const meds = ocrData?.extracted_medications.map(m => `${m.name} (${m.dosage})`) || [];
      const labs = ocrData?.abnormal_flags || [];

      const response = await fetch("http://localhost:8000/api/analyze-intake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          medications: meds,
          lab_values: labs,
          transcript: rawTranscript || "No voice transcript provided.",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reach Google Gemini via backend.");
        
      }

      const data = await response.json();
      setFusionSummary(data.summary);
    } catch (err: any) {
      setError(err.message || "Data Fusion is currently locked or unreachable.");
    } finally {
      setIsFusing(false);
    }
  };

  return (
    <div className="space-y-6 py-2">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white shadow-sm p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-brand-nha flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-blue-900">Multimodal Clinical Intake Kiosk</h1>
            <p className="text-xs text-slate-600 font-medium">Hindi/English Voice Capture + Document OCR Digitization</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-600">
          <span className="px-3 py-1 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Tokenized Identifier: <strong className="text-slate-800">{abhaToken}</strong>
          </span>
        </div>
      </div>

      {/* Patient Demographic Bar */}
      <div className="bg-white shadow-sm p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Patient Name</label>
          <div className="relative">
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-brand-nha focus:ring-1 focus:ring-brand-nha"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Age (Years)</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(parseInt(e.target.value) || 0)}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-brand-nha focus:ring-1 focus:ring-brand-nha"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-brand-nha focus:ring-1 focus:ring-brand-nha"
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Synthetic ABHA ID</label>
          <input
            type="text"
            value={abhaToken}
            onChange={(e) => setAbhaToken(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 font-mono font-medium focus:outline-none focus:border-brand-nha focus:ring-1 focus:ring-brand-nha"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span><strong>Error:</strong> {error}</span>
        </div>
      )}

      {/* Main 2 Grid Intake Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VoiceRecorder
          onTranscriptComplete={handleTranscriptComplete}
          isProcessing={isProcessingVoice}
        />

        <DocumentScanner
          onOcrComplete={(data) => setOcrData(data)}
          isScanning={isScanningDoc}
          onScanFile={handleScanFile}
        />
      </div>

      {/* OCR Results Display */}
      {ocrData && (
        <div className="bg-white shadow-sm p-6 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Amazon Textract Document Parsing Results
            </h3>
            <span className="text-xs text-slate-500 font-medium">File: {ocrData.filename}</span>
          </div>

          {ocrData.abnormal_flags.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
              <span className="text-xs font-bold text-amber-800">Abnormal Diagnostic Values Detected:</span>
              {ocrData.abnormal_flags.map((flag, idx) => (
                <p key={idx} className="text-xs text-amber-700 font-medium">{flag}</p>
              ))}
            </div>
          )}

          {ocrData.extracted_medications.length > 0 && (
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Extracted Medications ({ocrData.extracted_medications.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ocrData.extracted_medications.map((med, idx) => (
                  <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                    <span className="font-bold text-slate-800 block">{med.name}</span>
                    <span className="text-slate-600 font-medium">{med.dosage} • {med.frequency} ({med.duration})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* NEW: Data Fusion Module */}
      {(clinicalSummary || ocrData) && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 shadow-sm p-6 rounded-2xl border border-indigo-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-indigo-900 flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-indigo-600" />
                AI Data Fusion
              </h3>
              <p className="text-xs text-indigo-700 font-medium mt-1">
                Synthesize voice symptoms and scanned documents for interactions and next steps.
              </p>
            </div>
            
            <button
              onClick={handleGenerateFusionSummary}
              disabled={isFusing}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs tracking-wide shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {isFusing ? "Analyzing Data..." : "Generate Insights"}
            </button>
          </div>

          {fusionSummary && (
            <div className="mt-4 p-4 bg-white border border-indigo-100 rounded-xl shadow-sm">
              <div className="text-sm text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                {fusionSummary}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Structured Clinical Summary Output */}
      {clinicalSummary && (
        <div className="space-y-4">
          <ClinicalSummaryView summary={clinicalSummary} />

          <div className="flex justify-end pt-2">
            <button
              onClick={() => router.push(`/doctor?patient=${submittedId}`)}
              className="px-6 py-3 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs tracking-wide uppercase shadow-sm transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2"
            >
              <span>Transfer Patient to Physician Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
