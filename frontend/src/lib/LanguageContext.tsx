"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "hi";

type Translations = {
  [key in Language]: {
    [key: string]: string;
  };
};

const translations: Translations = {
  en: {
    // Navbar
    "nav.intake": "Secure Patient Intake",
    "nav.dashboard": "Clinical Review Dashboard",
    "nav.rural": "Care Coordination",
    "nav.compliant": "HIPAA / ABDM Compliant",
    "nav.subtitle": "Clinical Enterprise System",

    // Home Page
    "home.badge": "Production Ready • Clinical Grade",
    "home.title": "Streamline Clinical Workflows with",
    "home.subtitle": "Secure, accessible patient intake and care coordination platform for healthcare providers. Transcribe patient symptoms and digitize medical documents efficiently.",
    "home.feature1": "Secure NLP Extraction",
    "home.feature2": "Clinical Document OCR",
    "home.feature3": "WCAG 2.1 AA Accessible",
    "home.feature4": "Data Privacy Ensured",

    // Home Page Cards
    "card1.title": "Secure Patient Intake",
    "card1.badge": "Intake Module",
    "card1.desc": "Accessible interface for patients to record symptoms verbally or submit medical documents for automated transcription.",
    "card1.btn": "Launch Intake",
    
    "card2.title": "Clinical Decision Support",
    "card2.badge": "Provider Module",
    "card2.desc": "Professional review interface for physicians to assess structured clinical summaries generated from raw intake data.",
    "card2.btn": "Launch Dashboard",
    
    "card3.title": "Care Coordination",
    "card3.badge": "Referral Engine",
    "card3.desc": "Seamless tracking and referral management system connecting primary care facilities with specialist hospitals.",
    "card3.btn": "Launch Coordination",

    // Voice Recorder
    "voice.title": "Patient Symptom Recording",
    "voice.subtitle": "Select language and record symptoms clearly",
    "voice.start_sr": "Start voice recording",
    "voice.stop_sr": "Stop voice recording",
    "voice.listening": "Listening... Press to stop",
    "voice.idle": "Press microphone to start recording",
    "voice.transcript_label": "Clinical Notes / Transcript",
    "voice.placeholder": "Recorded speech will appear here. You can also type directly...",
    "voice.btn_clear": "Clear Notes",
    "voice.btn_submit": "Process Clinical Summary",
    "voice.btn_processing": "Processing with AI...",
    
    "voice.error.mic": "Microphone access denied. Please check permissions.",
    "voice.error.network": "Network connection issue. Please type below or load a sample.",
    "voice.error.nospeech": "No speech detected. Please try again or type below.",
    "voice.sample.btn": "Load Sample Patient Data",
  },
  hi: {
    // Navbar
    "nav.intake": "सुरक्षित मरीज पंजीकरण",
    "nav.dashboard": "क्लिनिकल समीक्षा डैशबोर्ड",
    "nav.rural": "देखभाल समन्वय",
    "nav.compliant": "HIPAA / ABDM अनुपालन",
    "nav.subtitle": "क्लिनिकल एंटरप्राइज सिस्टम",

    // Home Page
    "home.badge": "उत्पादन के लिए तैयार • क्लिनिकल ग्रेड",
    "home.title": "क्लिनिकल वर्कफ़्लो को सरल बनाएं",
    "home.subtitle": "स्वास्थ्य सेवा प्रदाताओं के लिए सुरक्षित, सुलभ मरीज पंजीकरण और देखभाल समन्वय मंच। मरीज के लक्षणों को ट्रांसक्राइब करें और मेडिकल दस्तावेज़ों को कुशलता से डिजिटल बनाएं।",
    "home.feature1": "सुरक्षित NLP निष्कर्षण",
    "home.feature2": "क्लिनिकल दस्तावेज़ OCR",
    "home.feature3": "WCAG 2.1 AA सुलभ",
    "home.feature4": "डेटा गोपनीयता सुनिश्चित",

    // Home Page Cards
    "card1.title": "सुरक्षित मरीज पंजीकरण",
    "card1.badge": "पंजीकरण मॉड्यूल",
    "card1.desc": "मरीजों के लिए लक्षणों को मौखिक रूप से रिकॉर्ड करने या स्वचालित प्रतिलेखन के लिए चिकित्सा दस्तावेज जमा करने के लिए सुलभ इंटरफ़ेस।",
    "card1.btn": "पंजीकरण शुरू करें",
    
    "card2.title": "क्लिनिकल निर्णय समर्थन",
    "card2.badge": "प्रदाता मॉड्यूल",
    "card2.desc": "कच्चे पंजीकरण डेटा से उत्पन्न संरचित क्लिनिकल सारांश का आकलन करने के लिए चिकित्सकों के लिए पेशेवर समीक्षा इंटरफ़ेस।",
    "card2.btn": "डैशबोर्ड खोलें",
    
    "card3.title": "देखभाल समन्वय",
    "card3.badge": "रेफरल इंजन",
    "card3.desc": "प्राथमिक देखभाल सुविधाओं को विशेषज्ञ अस्पतालों से जोड़ने वाली निर्बाध ट्रैकिंग और रेफरल प्रबंधन प्रणाली।",
    "card3.btn": "समन्वय शुरू करें",

    // Voice Recorder
    "voice.title": "मरीज के लक्षणों की रिकॉर्डिंग",
    "voice.subtitle": "भाषा चुनें और लक्षणों को स्पष्ट रूप से रिकॉर्ड करें",
    "voice.start_sr": "वॉयस रिकॉर्डिंग शुरू करें",
    "voice.stop_sr": "वॉयस रिकॉर्डिंग बंद करें",
    "voice.listening": "सुन रहा हूँ... रोकने के लिए दबाएँ",
    "voice.idle": "रिकॉर्डिंग शुरू करने के लिए माइक्रोफ़ोन दबाएँ",
    "voice.transcript_label": "क्लिनिकल नोट्स / ट्रांसक्रिप्ट",
    "voice.placeholder": "रिकॉर्ड किया गया भाषण यहाँ दिखाई देगा। आप सीधे टाइप भी कर सकते हैं...",
    "voice.btn_clear": "नोट्स साफ़ करें",
    "voice.btn_submit": "क्लिनिकल सारांश संसाधित करें",
    "voice.btn_processing": "संसाधित किया जा रहा है...",
    
    "voice.error.mic": "माइक्रोफोन एक्सेस से इनकार कर दिया गया। कृपया अनुमतियों की जाँच करें।",
    "voice.error.network": "नेटवर्क कनेक्शन समस्या। कृपया नीचे टाइप करें या एक नमूना लोड करें।",
    "voice.error.nospeech": "कोई भाषण नहीं मिला। कृपया पुनः प्रयास करें या नीचे टाइप करें।",
    "voice.sample.btn": "नमूना रोगी डेटा लोड करें",
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  const t = (key: string): string => {
    return translations[language][key] || translations["en"][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
