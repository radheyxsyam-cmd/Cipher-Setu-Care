"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Stethoscope, HeartPulse, Building2, ShieldCheck, Globe, Lock } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export default function Navbar() {
  const pathname = usePathname();
  const { t, language, setLanguage } = useLanguage();

  const navLinks = [
    { href: "/kiosk", label: t("nav.intake"), icon: Activity, desc: "Kiosk Mode" },
    { href: "/doctor", label: t("nav.dashboard"), icon: Stethoscope, desc: "Doctor Mode" },
    { href: "/rural", label: t("nav.rural"), icon: Building2, desc: "PHC / Queue Mode" },
    { href: "/login", label: "Login", icon: Lock, desc: "Login" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center space-x-3 group focus:outline-none focus:ring-2 focus:ring-brand-orange rounded-xl p-1"
            aria-label="Home"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-nha flex items-center justify-center text-white shadow-sm">
              <HeartPulse className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xl tracking-tight text-brand-nha">SETU-Care</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-none font-medium">{t("nav.subtitle")}</p>
            </div>
          </Link>

          {/* Nav Items */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-orange ${
                    isActive
                      ? "bg-slate-100 text-brand-nha"
                      : "text-slate-600 hover:text-brand-nha hover:bg-slate-50"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-brand-nha" : "text-slate-500"}`} aria-hidden="true" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center space-x-3">
            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === "en" ? "hi" : "en")}
              className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-orange"
              aria-label="Toggle Language"
            >
              <Globe className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span>{language === "en" ? "EN" : "HI"}</span>
            </button>

            {/* Status badge */}
            <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-600 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <ShieldCheck className="w-4 h-4 text-brand-emerald" aria-hidden="true" />
              <span>{t("nav.compliant")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile nav bar */}
      <nav aria-label="Mobile Navigation" className="md:hidden flex items-center justify-around border-t border-slate-200 py-2 bg-white/90 shadow-sm">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center space-y-1 text-xs py-1 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange ${
                isActive ? "text-brand-nha font-bold" : "text-slate-600 font-medium"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span>{link.desc}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
