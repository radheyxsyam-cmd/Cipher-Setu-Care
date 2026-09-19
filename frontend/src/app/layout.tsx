import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { LanguageProvider } from "@/lib/LanguageContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SETU-Care | Clinical Enterprise Platform",
  description:
    "Production-grade healthcare platform for multi-lingual clinical intake, document digitization, and rural referral coordination.",
  keywords: [
    "Healthcare AI",
    "Clinical Intake",
    "SOCRATES Medical Framework",
    "ABHA",
    "Rural Health",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased selection:bg-brand-nha/30 selection:text-brand-nha">
        <LanguageProvider>
          <Navbar />
          <main aria-label="Main Content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 focus:outline-none" tabIndex={-1}>
            {children}
          </main>

          <footer aria-label="Footer" className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 bg-white">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p>© 2026 SETU-Care Healthcare Platform</p>
              <p className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2 h-2 rounded-full bg-brand-emerald" aria-hidden="true" />
                System Active • Secure & ABDM Compliant
              </p>
            </div>
          </footer>
        </LanguageProvider>
      </body>
    </html>
  );
}
