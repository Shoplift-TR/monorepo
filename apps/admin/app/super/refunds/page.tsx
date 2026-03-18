"use client";

import { useState } from "react";
import { adminApi } from "@/lib/api";

export default function RefundsPage() {
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    msg: string;
  } | null>(null);

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;

    setLoading(true);
    setResult(null);

    const { data, error } = await adminApi.issueRefund({
      order_id: orderId,
      reason,
    });

    if (error) {
      setResult({ success: false, msg: error });
    } else {
      setResult({
        success: true,
        msg: `Refund successfully initiated for order ${orderId}`,
      });
      setOrderId("");
      setReason("");
    }

    setLoading(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-zinc-900">Issue Refund</h1>

      <div className="bg-white p-6 rounded-[16px] border border-zinc-100 shadow-sm">
        <form onSubmit={handleRefund} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-zinc-900 mb-1">
              Order ID
            </label>
            <input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="e.g. 1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p"
              className="w-full h-12 px-4 border border-zinc-200 rounded-[12px] bg-zinc-50 focus:bg-white focus:outline-none focus:border-[#E2103C] transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-900 mb-1">
              Reason for Refund
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Customer received cold food..."
              className="w-full p-4 min-h-[120px] border border-zinc-200 rounded-[12px] bg-zinc-50 focus:bg-white focus:outline-none focus:border-[#E2103C] transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-[24px] bg-[#E2103C] text-white font-bold text-[15px] disabled:opacity-50 active:scale-[0.98] transition-all"
          >
            {loading ? "Processing..." : "Issue Refund"}
          </button>
        </form>

        {result && (
          <div
            className={`mt-6 p-4 rounded-[12px] font-medium text-sm border ${result.success ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}
          >
            {result.msg}
          </div>
        )}
      </div>

      <div className="p-6 bg-zinc-200/50 rounded-[16px] border border-zinc-200 border-dashed text-center">
        <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
          (Payment gateway integration pending)
        </p>
      </div>
    </div>
  );
}
