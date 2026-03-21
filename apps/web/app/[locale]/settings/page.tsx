"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function SettingsPage() {
  const { user, updateUsername } = useAuth();
  const { locale } = useParams();
  const router = useRouter();

  const [newUsername, setNewUsername] = useState(user?.username || "");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError(null);
    setUsernameSuccess(false);
    setLoading(true);

    const sanitized = newUsername
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 30);

    if (sanitized.length < 3) {
      setUsernameError("Username must be at least 3 characters.");
      setLoading(false);
      return;
    }

    const { error } = await updateUsername(sanitized);
    if (error) {
      setUsernameError(error);
    } else {
      setUsernameSuccess(true);
      setNewUsername(sanitized);
    }
    setLoading(false);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f8f9fa] pt-24 pb-12 px-6">
        <div className="max-w-xl mx-auto">
          <h1 className="text-[#101744] font-extrabold text-2xl tracking-[-0.04em] mb-2">
            Settings
          </h1>
          <p className="text-[#5e5e5e] text-sm mb-8">
            Manage your account preferences
          </p>

          {/* Username section */}
          <div className="bg-white rounded-2xl shadow-[0_12px_24px_rgba(0,4,53,0.08)] p-6 mb-6">
            <h2 className="text-[#101744] font-bold text-base mb-1">
              Username
            </h2>
            <p className="text-[#5e5e5e] text-sm mb-4">
              Your unique identifier on Shoplift. Used for discounts and
              referrals.
            </p>
            <form
              onSubmit={handleUsernameSubmit}
              className="flex flex-col gap-3"
            >
              <div>
                <label
                  className="block text-[0.6875rem] font-bold uppercase tracking-[0.05em] 
                                  text-[#46464f] mb-1"
                >
                  Username
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[#5e5e5e] font-medium text-sm">@</span>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) =>
                      setNewUsername(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_]/g, "")
                          .slice(0, 30),
                      )
                    }
                    placeholder="your_username"
                    maxLength={30}
                    className="flex-1 h-11 px-4 rounded-xl bg-[#f3f4f5] text-[#191c1d] 
                               text-sm focus:outline-none focus:bg-[#edeeef] transition-colors"
                  />
                </div>
              </div>
              {usernameError && (
                <p className="text-[#ba1a1a] text-sm">{usernameError}</p>
              )}
              {usernameSuccess && (
                <p className="text-[#1a7a1a] text-sm font-medium">
                  Username updated successfully.
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="self-start h-10 px-6 rounded-full bg-[#92fc40] text-[#0b2000] 
                           font-bold text-sm hover:bg-[#77df1e] transition-colors 
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : "Save Username"}
              </button>
            </form>
          </div>

          {/* Placeholder for future settings */}
          <div
            className="bg-white rounded-2xl shadow-[0_12px_24px_rgba(0,4,53,0.08)] p-6 
                          opacity-50"
          >
            <h2 className="text-[#101744] font-bold text-base mb-1">
              Display Name
            </h2>
            <p className="text-[#5e5e5e] text-sm">Coming soon</p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
