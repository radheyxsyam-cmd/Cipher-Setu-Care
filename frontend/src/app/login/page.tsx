"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [abhaId, setAbhaId] = useState("");
  const [linkedFamily, setLinkedFamily] = useState<string[]>([]);
  const [familyAbha, setFamilyAbha] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (abhaId.trim().length > 10) {
      setIsLoggedIn(true);
    }
  };

  const handleAddFamilyMember = () => {
    if (familyAbha.trim() && !linkedFamily.includes(familyAbha)) {
      setLinkedFamily([...linkedFamily, familyAbha]);
      setFamilyAbha("");
    }
  };

  const navigateToIntake = () => {
    // Routes the user to the Kiosk after successful login/setup
    router.push("/kiosk");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center text-white font-bold">
            +
          </div>
          <div>
            <h2 className="text-2xl font-bold text-blue-900">ABHA Portal</h2>
            <p className="text-xs text-slate-500 font-medium">Patient & Family Access</p>
          </div>
        </div>

        {!isLoggedIn ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                ABHA ID / Mobile Number
              </label>
              <input
                type="text"
                placeholder="e.g. 14-XXXX-XXXX-XXXX"
                value={abhaId}
                onChange={(e) => setAbhaId(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-900 focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition-colors shadow-sm"
            >
              Verify & Login with OTP
            </button>
          </form>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex justify-between items-center">
              <div>
                <p className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">Active Patient</p>
                <p className="text-sm text-emerald-900 font-bold">{abhaId}</p>
              </div>
              <span className="bg-emerald-200 text-emerald-800 text-xs px-2 py-1 rounded font-bold">Verified</span>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-bold text-blue-900 mb-3">Linked Family ABHA Accounts</h3>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Enter Family Member ABHA"
                  value={familyAbha}
                  onChange={(e) => setFamilyAbha(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddFamilyMember}
                  className="bg-blue-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
                >
                  Link
                </button>
              </div>

              <ul className="space-y-2 mb-6">
                {linkedFamily.map((id, index) => (
                  <li key={index} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-800">
                    <span>ABHA: <strong className="text-blue-900">{id}</strong></span>
                    <button className="text-orange-600 hover:text-orange-700 text-xs font-bold hover:underline">
                      View Records
                    </button>
                  </li>
                ))}
                {linkedFamily.length === 0 && (
                  <p className="text-xs text-slate-500 italic">No family members linked yet. Add their ABHA ID above to manage their care.</p>
                )}
              </ul>
            </div>

            <button
              onClick={navigateToIntake}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg transition-colors shadow-sm"
            >
              Proceed to Clinical Intake →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}