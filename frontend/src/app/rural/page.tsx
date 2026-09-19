"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Users,
  Send,
  Video,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Activity,
  X,
} from "lucide-react";
import {
  api,
  QueueEntry,
  ReferralRecord,
  RuralStats,
} from "@/lib/api";
import {
  QUEUE_STATUS_LABELS,
  SEVERITY_COLORS,
  REFERRAL_TYPE_LABELS,
  DEMO_FACILITY_ID,
} from "@/lib/constants";

export default function RuralPage() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [stats, setStats] = useState<RuralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");

  // Referral Modal Form State
  const [referralType, setReferralType] = useState<"district_hospital" | "tele_consultation" | "specialist">("district_hospital");
  const [reason, setReason] = useState("");
  const [destinationFacility, setDestinationFacility] = useState("District Government Hospital, Nashik");
  const [urgency, setUrgency] = useState("moderate");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [qData, refData, statsData] = await Promise.all([
        api.getRuralQueue(DEMO_FACILITY_ID),
        api.listReferrals(),
        api.getRuralStats(),
      ]);
      setQueue(qData);
      setReferrals(refData);
      setStats(statsData);
    } catch (err: any) {
      console.error("Failed to load rural data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openReferralModal = (patientId: string) => {
    setSelectedPatientId(patientId);
    setShowReferralModal(true);
  };

  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setIsSubmitting(true);
    try {
      await api.createReferral({
        patient_id: selectedPatientId,
        referral_type: referralType,
        reason,
        destination_facility: destinationFacility,
        urgency,
        referring_physician: "Dr. Arun Patil (PHC In-Charge)",
      });
      setShowReferralModal(false);
      setReason("");
      fetchData(); // Refresh list
    } catch (err: any) {
      alert("Failed to create referral: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white shadow-sm p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-blue-900">Rural Care & Specialist Referral Engine</h1>
            <p className="text-xs text-slate-600 font-medium">Primary Health Centre Queue & Tele-Consultation Hub (PHC-MH-001)</p>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200 flex items-center gap-1.5 self-start sm:self-auto focus:outline-none focus:ring-2 focus:ring-brand-nha transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active Queue", val: stats?.waiting ?? 0, icon: Users, color: "text-amber-600 bg-amber-50 border-amber-200" },
          { label: "In Consultation", val: stats?.in_progress ?? 0, icon: Activity, color: "text-brand-nha bg-blue-50 border-blue-200" },
          { label: "Active Referrals", val: stats?.active_referrals ?? 0, icon: Send, color: "text-blue-600 bg-blue-50 border-blue-200" },
          { label: "Completed Today", val: stats?.completed_today ?? 0, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white shadow-sm p-4 rounded-xl border border-slate-200 flex items-center space-x-3">
              <div className={`p-2.5 rounded-lg border ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[11px] text-slate-500 font-bold uppercase">{card.label}</span>
                <span className="text-xl font-extrabold text-slate-800">{card.val}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Queue Table */}
      <div className="bg-white shadow-sm p-6 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            PHC Patient Queue Management
          </h2>
          <span className="text-xs text-slate-500 font-bold">Total Queue: {queue.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider bg-slate-50 font-bold">
                <th className="py-3 px-4 rounded-tl-lg">Patient Info</th>
                <th className="py-3 px-4">ABHA ID Token</th>
                <th className="py-3 px-4">Chief Complaint</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right rounded-tr-lg">Referral Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {queue.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-semibold">
                    No active patients in PHC queue.
                  </td>
                </tr>
              ) : (
                queue.map((pt) => {
                  const statusInfo = QUEUE_STATUS_LABELS[pt.queue_status] || {
                    label: pt.queue_status,
                    color: "text-slate-600 bg-slate-100 border-slate-200",
                  };
                  return (
                    <tr key={pt.patient_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 block">{pt.patient_name}</span>
                        <span className="text-[10px] text-slate-500">{pt.patient_id}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-brand-nha font-semibold">{pt.abha_token}</td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                        {pt.chief_complaint || "No transcript"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${statusInfo.color.replace("text-slate-400", "text-slate-700").replace("bg-surface-100", "bg-slate-100")}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => openReferralModal(pt.patient_id)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Referral</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Referrals Tracker List */}
      <div className="bg-white shadow-sm p-6 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            Active District Hospital & Tele-Consultation Referrals
          </h2>
          <span className="text-xs text-slate-500 font-bold">{referrals.length} Total</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {referrals.length === 0 ? (
            <p className="text-xs text-slate-500 col-span-2 text-center py-4 font-semibold">No active referrals recorded.</p>
          ) : (
            referrals.map((ref) => (
              <div key={ref.referral_id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ArrowUpRight className="w-4 h-4 text-brand-nha" />
                    {REFERRAL_TYPE_LABELS[ref.referral_type] || ref.referral_type}
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-slate-500">{ref.referral_id}</span>
                </div>
                <p className="text-xs text-slate-600 font-medium">{ref.reason}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200 font-medium">
                  <span>Destination: {ref.destination_facility || "N/A"}</span>
                  <span className="text-emerald-600 font-bold capitalize">Status: {ref.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Referral Creation Modal */}
      {showReferralModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-blue-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-brand-nha" />
                Initiate Patient Specialist Referral
              </h3>
              <button
                onClick={() => setShowReferralModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-brand-nha"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReferral} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Patient</label>
                <input
                  type="text"
                  value={selectedPatientId}
                  disabled
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-600 font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Referral Type</label>
                <select
                  value={referralType}
                  onChange={(e: any) => setReferralType(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-brand-nha focus:ring-1 focus:ring-brand-nha"
                >
                  <option value="district_hospital">District Hospital Referral</option>
                  <option value="tele_consultation">Tele-Consultation Session</option>
                  <option value="specialist">Specialist Referral</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Reason for Referral</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Detail primary clinical reason, red flags, or required specialist intervention..."
                  rows={3}
                  required
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-brand-nha focus:ring-1 focus:ring-brand-nha resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Destination Facility</label>
                <input
                  type="text"
                  value={destinationFacility}
                  onChange={(e) => setDestinationFacility(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-brand-nha focus:ring-1 focus:ring-brand-nha"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReferralModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wide shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2"
                >
                  {isSubmitting ? "Creating..." : "Confirm Referral"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
