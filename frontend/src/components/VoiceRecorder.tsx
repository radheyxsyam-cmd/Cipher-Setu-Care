"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Sparkles, Send, RefreshCw, AlertCircle, Volume2 } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

interface VoiceRecorderProps {
  onTranscriptComplete: (transcript: string, language: string) => void;
  isProcessing: boolean;
}

export default function VoiceRecorder({ onTranscriptComplete, isProcessing }: VoiceRecorderProps) {
  const { t, language } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Default to hi-IN because Google's hi-IN model excellently handles mixed Hindi/English (Hinglish)
  const speechLang = language === "hi" ? "hi-IN" : "en-IN";

  useEffect(() => {
    // Check Web Speech API support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLang;

      recognition.onresult = (event: any) => {
        let currentFullTranscript = "";
        
        // Loop from 0 to rebuild the exact current state of the engine's buffer
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentFullTranscript += event.results[i][0].transcript.trim() + " ";
          } else {
            currentFullTranscript += event.results[i][0].transcript;
          }
        }
        
        // Overwrite the React state entirely, do NOT append to prev
        setTranscript(currentFullTranscript);
      };
      
      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsRecording(false);

        switch (event.error) {
          case "not-allowed":
          case "permission-denied":
            setErrorMsg(t("voice.error.mic"));
            break;
          case "no-speech":
            setErrorMsg(t("voice.error.nospeech"));
            break;
          case "network":
            setErrorMsg(t("voice.error.network"));
            break;
          case "aborted":
            break;
          default:
            setErrorMsg(`${event.error}. Please type below.`);
            break;
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn("SpeechRecognition initialization failed:", err);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }
    };
  }, [speechLang, t]);

  const toggleRecording = () => {
    setErrorMsg(null);
    if (!recognitionRef.current) {
      setErrorMsg("Speech recognition is not supported or initialized in this browser. Load sample below to test.");
      return;
    }

    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn("Error calling stop() on recognition:", e);
      } finally {
        setIsRecording(false);
      }
    } else {
      setTranscript("");
      try {
        recognitionRef.current.lang = speechLang;
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err: any) {
        console.warn("Recognition start exception caught:", err);
        if (err.name === "InvalidStateError" || err.message?.includes("already started")) {
          try {
            recognitionRef.current.stop();
          } catch (e) {}
          setIsRecording(false);
          setErrorMsg("Microphone reset required. Please click mic again or load sample transcript.");
        } else {
          setIsRecording(false);
          setErrorMsg("Could not start microphone. Click below to load sample clinical transcript.");
        }
      }
    }
  };

  const handleClear = () => {
    setTranscript("");
    setErrorMsg(null);
  };

  const handleSubmit = () => {
    if (!transcript.trim()) return;
    onTranscriptComplete(transcript.trim(), speechLang);
  };

  const loadPreset = (text: string) => {
    setTranscript(text);
    setErrorMsg(null);
  };

  const loadSampleTranscript = () => {
    if (language === "hi") {
      loadPreset("Mujhe teen din se tez bukhar hai, sar dard aur badan me dard hai. Khana khane ka man nahi karta.");
    } else {
      loadPreset("I have chest pain radiating to my left arm, along with shortness of breath and sweating since 2 hours.");
    }
  };

  // SMART TEXT-TO-SPEECH: Auto-detects language based on characters
  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel(); 
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Check if the text contains Devanagari (Hindi) script
      const containsHindi = /[\u0900-\u097F]/.test(text);
      
      // Assign the correct voice engine based on detected script
      utterance.lang = containsHindi ? "hi-IN" : "en-IN"; 
      utterance.rate = 0.95;
      
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Mic className="w-5 h-5 text-brand-nha" aria-hidden="true" />
            {t("voice.title")}
          </h2>
          <p className="text-xs text-slate-600 font-medium">
            {t("voice.subtitle")}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 relative overflow-hidden">
        {isRecording && (
          <div className="flex items-center space-x-1.5 mb-6 h-12" aria-hidden="true">
            {[0.4, 0.8, 1.2, 0.6, 0.9, 0.5, 1.1, 0.7].map((delay, idx) => (
              <div
                key={idx}
                className="w-1.5 bg-brand-orange rounded-full animate-wave-pulse"
                style={{ animationDelay: `${delay * 0.2}s` }}
              />
            ))}
          </div>
        )}

        <button
          onClick={toggleRecording}
          disabled={isProcessing}
          aria-label={isRecording ? t("voice.stop_sr") : t("voice.start_sr")}
          aria-pressed={isRecording}
          className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all transform active:scale-95 shadow-lg focus:outline-none focus:ring-4 focus:ring-brand-orange focus:ring-offset-2 focus:ring-offset-slate-50 ${
            isRecording
              ? "bg-red-600 text-white shadow-red-500/30 animate-pulse"
              : "bg-brand-orange text-white hover:bg-orange-600 shadow-brand-orange/25 hover:scale-105"
          }`}
        >
          <span className="sr-only">
            {isRecording ? t("voice.stop_sr") : t("voice.start_sr")}
          </span>
          {isRecording ? (
            <MicOff className="w-8 h-8" aria-hidden="true" />
          ) : (
            <Mic className="w-8 h-8" aria-hidden="true" />
          )}
        </button>

        <p className="mt-6 text-xs font-bold text-slate-700" aria-live="polite">
          {isRecording ? (
            <span className="text-brand-orange flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" aria-hidden="true" />
              {t("voice.listening")}
            </span>
          ) : (
             t("voice.idle")
          )}
        </p>

        {!isSupported && (
          <p className="mt-2 text-xs text-amber-600 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" /> Web Speech API not supported. Please type below.
          </p>
        )}
      </div>

      {errorMsg && (
        <div 
          className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
          role="alert" 
          aria-live="assertive"
        >
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={loadSampleTranscript}
            className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
            <span>{t("voice.sample.btn")}</span>
          </button>
        </div>
      )}

      <div className="mt-6">
        <label htmlFor="transcript-input" className="block text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
          <span>{t("voice.transcript_label")}</span>
          <span className="text-[10px] text-slate-500 font-medium" aria-live="polite">{transcript.length} chars</span>
        </label>
        <textarea
          id="transcript-input"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder={t("voice.placeholder")}
          rows={5}
          className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-nha focus:ring-1 focus:ring-brand-nha resize-none transition-all shadow-sm"
          aria-label={t("voice.transcript_label")}
        />
      </div>

      <div className="mt-4">
        <span className="text-[11px] text-slate-500 font-bold" id="quick-demo-label">Demo Samples:</span>
        <div className="flex flex-wrap gap-2 mt-2" aria-labelledby="quick-demo-label">
          <button
            onClick={() => loadPreset("मुझे तीन दिन से बुखार है और सिर में बहुत दर्द हो रहा है।")}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-nha"
          >
            🇮🇳 Pure Hindi Sample
          </button>
          <button
            onClick={() => loadPreset("Mujhe teen din se tez bukhar hai, sar dard aur badan me dard hai. Khana khane ka man nahi karta.")}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-nha"
          >
            🗣️ Hinglish Sample
          </button>
          <button
            onClick={() => loadPreset("I have chest pain radiating to my left arm, along with shortness of breath and sweating since 2 hours.")}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-nha"
          >
            🇬🇧 English Cardiac Sample
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4 pt-5 border-t border-slate-200">
        <div className="flex justify-center sm:justify-start gap-3 w-full sm:w-auto">
          <button
            onClick={handleClear}
            disabled={!transcript}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-slate-300 rounded-lg flex-1 sm:flex-none justify-center"
            aria-label={t("voice.btn_clear")}
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            {t("voice.btn_clear")}
          </button>
          
          <button
            onClick={() => speakText(transcript)}
            disabled={!transcript}
            className="px-4 py-2 text-xs font-bold text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 disabled:opacity-40 transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-300 rounded-lg flex-1 sm:flex-none justify-center"
          >
            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
            Play Audio
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!transcript.trim() || isProcessing}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs tracking-wide shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2 focus:ring-offset-white"
          aria-busy={isProcessing}
        >
          {isProcessing ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>{t("voice.btn_processing")}</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" aria-hidden="true" />
              <span>{t("voice.btn_submit")}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
