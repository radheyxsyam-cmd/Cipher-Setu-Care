"use client";

import { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, Sparkles, X, Pill, Activity } from "lucide-react";
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE_MB } from "@/lib/constants";
import { OCRResponse } from "@/lib/api";

interface DocumentScannerProps {
  onOcrComplete: (ocrData: OCRResponse) => void;
  isScanning: boolean;
  onScanFile: (file: File) => Promise<void>;
}

export default function DocumentScanner({ onOcrComplete, isScanning, onScanFile }: DocumentScannerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lastOcrResult, setLastOcrResult] = useState<OCRResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (file: File) => {
    setErrorMsg(null);
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setErrorMsg("Invalid file type. Please upload a JPEG, PNG, or PDF document.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setErrorMsg(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds 5MB limit.`);
      return;
    }
    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setLastOcrResult(null);
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setLastOcrResult(null);
      validateAndSetFile(e.target.files[0]);
      e.target.value = "";
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMsg(null);
    setLastOcrResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      setErrorMsg(null);
      await onScanFile(selectedFile);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to scan document.");
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-nha" />
            Prescription & Lab OCR Digitization
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            Upload handwritten prescriptions or diagnostic reports (Amazon Textract OCR)
          </p>
        </div>
      </div>

      {/* Upload Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
          dragActive
            ? "border-brand-nha bg-blue-50"
            : selectedFile
            ? "border-brand-nha/40 bg-slate-50"
            : "border-slate-200 hover:border-brand-nha/40 bg-slate-50/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={handleChange}
          className="hidden"
        />

        {!selectedFile ? (
          <div className="flex flex-col items-center py-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-brand-nha mb-3 border border-blue-100">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">
              Drag & drop medical file or <span className="text-brand-nha underline">browse</span>
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Supports JPEG, PNG, PDF (Max size: 5MB)
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between p-2 gap-3">
            <div className="flex items-center space-x-3 text-left flex-1 min-w-0">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Document Preview"
                  className="w-14 h-14 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center text-brand-nha border border-slate-200 shadow-sm flex-shrink-0">
                  <FileText className="w-7 h-7" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{selectedFile.name}</p>
                <p className="text-xs text-slate-500 font-medium truncate">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type || "Document"}
                </p>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-nha flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 font-medium">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload Action Button */}
      {selectedFile && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleUpload}
            disabled={isScanning}
            className="px-6 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs tracking-wide uppercase shadow-sm disabled:opacity-40 transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2"
          >
            {isScanning ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Digitizing with Textract...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Run Amazon Textract OCR</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
