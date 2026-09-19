"use client";

import Link from "next/link";
import {
  Mic,
  Stethoscope,
  Building2,
  ShieldCheck,
  Zap,
  Activity,
  FileText,
  Lock,
  Cpu,
} from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export default function Home() {
  const { t } = useLanguage();

  const modes = [
    {
      title: t("card1.title"),
      path: "/kiosk",
      icon: Mic,
      badge: t("card1.badge"),
      color: "from-brand-nha to-blue-700",
      textColor: "text-brand-nha",
      borderColor: "hover:border-brand-nha/50",
      description: t("card1.desc"),
      btnText: t("card1.btn"),
      features: [
        t("home.feature1"),
        t("home.feature2"),
        t("home.feature3"),
        t("home.feature4"),
      ],
    },
    {
      title: t("card2.title"),
      path: "/doctor",
      icon: Stethoscope,
      badge: t("card2.badge"),
      color: "from-slate-600 to-slate-500",
      textColor: "text-slate-700",
      borderColor: "hover:border-slate-500/50",
      description: t("card2.desc"),
      btnText: t("card2.btn"),
      features: [
        "Structured Summaries",
        "Clinical Decision Support",
        "Red Flag Alerts",
        "Secure Storage",
      ],
    },
    {
      title: t("card3.title"),
      path: "/rural",
      icon: Building2,
      badge: t("card3.badge"),
      color: "from-brand-emerald to-emerald-500",
      textColor: "text-brand-emerald",
      borderColor: "hover:border-brand-emerald/50",
      description: t("card3.desc"),
      btnText: t("card3.btn"),
      features: [
        "Referral Management",
        "Facility Routing",
        "Queue Tracking",
        "ABDM Standards",
      ],
    },
  ];

  return (
    <div className="space-y-12 py-4">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4 relative">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold shadow-sm">
          <ShieldCheck className="w-4 h-4 text-brand-emerald" />
          <span>{t("home.badge")}</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-800 leading-tight">
          {t("home.title")} <span className="text-brand-nha">SETU-Care</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-medium">
          {t("home.subtitle")}
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {[
            { icon: Lock, label: t("home.feature4") },
            { icon: FileText, label: t("home.feature2") },
            { icon: ShieldCheck, label: t("nav.compliant") },
          ].map((pill, i) => {
            const Icon = pill.icon;
            return (
              <span
                key={i}
                className="flex items-center space-x-1.5 px-3 py-1 bg-white rounded-lg text-xs font-semibold text-slate-700 border border-slate-200 shadow-sm"
              >
                <Icon className="w-3.5 h-3.5 text-brand-nha" />
                <span>{pill.label}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Mode Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {modes.map((mode) => {
          const Icon = mode.icon;
          return (
            <div
              key={mode.path}
              className={`bg-white rounded-2xl p-6 flex flex-col justify-between border border-slate-200 shadow-sm ${mode.borderColor} transition-all duration-300 group`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${mode.color} p-0.5 shadow-sm`}>
                    <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                      <Icon className={`w-6 h-6 ${mode.textColor}`} />
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-slate-50 border border-slate-200 text-slate-600 rounded-lg">
                    {mode.badge}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-slate-800 mb-2">
                  {mode.title}
                </h2>

                <p className="text-xs text-slate-600 leading-relaxed mb-6 font-medium">
                  {mode.description}
                </p>

                {/* Bullet Points */}
                <ul className="space-y-2 mb-6" aria-label={`Features for ${mode.title}`}>
                  {mode.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center text-xs text-slate-700 font-medium gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${mode.textColor.replace("text-", "bg-")} flex-shrink-0`} aria-hidden="true" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <Link
                href={mode.path}
                className="w-full py-3 px-4 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs transition-colors flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2 focus:ring-offset-white shadow-sm"
                aria-label={`Navigate to ${mode.title}`}
              >
                <span>{mode.btnText}</span>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
