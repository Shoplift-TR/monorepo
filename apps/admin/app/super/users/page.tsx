"use client";

import { useState } from "react";
import { adminApi } from "@/lib/api";
import { Search, Copy } from "lucide-react";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorStr, setErrorStr] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search) return;

    setLoading(true);
    setErrorStr("");
    setUser(null);

    // We assume search is UID for now as API expects /users/:id
    // Real implementation would have a search endpoint that looks up by email
    const { data, error } = await adminApi.getUser(search);
    if (data) {
      setUser(data);
    } else {
      setErrorStr(error || "User not found");
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied!");
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">User Lookup</h1>

      <form onSubmit={handleSearch} className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            placeholder="Search by User ID (UUID)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-white border border-zinc-200 rounded-[12px] shadow-sm focus:outline-none focus:border-[#E2103C]"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-8 h-12 rounded-[24px] bg-[#E2103C] text-white font-bold disabled:opacity-50"
        >
          {loading ? "Searching" : "Search"}
        </button>
      </form>

      {errorStr && (
        <div className="p-4 bg-red-50 text-red-600 rounded-[12px] border border-red-100">
          {errorStr}
        </div>
      )}

      {user && (
        <div className="bg-white rounded-[12px] border border-zinc-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="p-6 border-b border-zinc-100 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">
                {user.display_name}
              </h2>
              <p className="text-sm text-zinc-500">
                {user.email} • {user.phone || "No phone"}
              </p>
            </div>
            <span className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-xs font-bold uppercase tracking-wider">
              {user.role}
            </span>
          </div>

          <div className="grid grid-cols-2 divide-x divide-zinc-100">
            <div className="p-6 space-y-4">
              <h3 className="font-bold text-zinc-900 uppercase text-xs tracking-wider">
                Auth History
              </h3>
              <div className="space-y-2 text-sm text-zinc-600">
                <p>
                  <span className="font-medium text-zinc-900">Created At:</span>{" "}
                  {new Date(user.auth.created_at).toLocaleString("tr-TR")}
                </p>
                <p>
                  <span className="font-medium text-zinc-900">
                    Last Sign In:
                  </span>{" "}
                  {new Date(user.auth.last_sign_in_at).toLocaleString("tr-TR")}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <h3 className="font-bold text-zinc-900 uppercase text-xs tracking-wider">
                Tools
              </h3>
              <button
                onClick={() => copyToClipboard(user.id)}
                className="w-full h-10 border border-zinc-200 rounded-[8px] flex items-center justify-center gap-2 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition"
              >
                <Copy className="w-4 h-4" /> Copy UID
              </button>
              <button className="w-full h-10 border border-zinc-200 rounded-[8px] flex items-center justify-center gap-2 text-sm font-bold text-[#E2103C] bg-red-50 hover:bg-red-100 transition">
                Impersonate Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
