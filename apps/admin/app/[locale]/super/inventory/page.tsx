"use client";

import { useState, useEffect } from "react";
import { adminApi } from "@/lib/api";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function InventoryPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRest, setExpandedRest] = useState<string | null>(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    const { data } = await adminApi.getInventory();
    if (data) setData(data);
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-zinc-900">Platform Inventory</h1>

      <div className="bg-white rounded-[12px] border border-zinc-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">
            Loading inventory...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F9F9F9] border-b border-zinc-100">
                  <th className="py-3 px-6 text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                    Restaurant
                  </th>
                  <th className="py-3 px-6 text-[11px] font-black text-zinc-400 uppercase tracking-wider text-center">
                    Total Items
                  </th>
                  <th className="py-3 px-6 text-[11px] font-black text-zinc-400 uppercase tracking-wider text-center">
                    Available Elements
                  </th>
                  <th className="py-3 px-6 text-[11px] font-black text-zinc-400 uppercase tracking-wider text-center">
                    Out of Stock
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-zinc-50">
                {data.map((rest) => {
                  const hasOut = rest.out_of_stock_items > 0;
                  const isExpanded = expandedRest === rest.restaurant_id;

                  return (
                    <tr
                      key={rest.restaurant_id}
                      className={`group hover:bg-zinc-50/50 transition-colors cursor-pointer ${hasOut ? "bg-red-50/30" : ""}`}
                      onClick={() =>
                        setExpandedRest(isExpanded ? null : rest.restaurant_id)
                      }
                    >
                      <td className="py-4 px-6 relative">
                        {hasOut && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                        )}
                        <p className="font-bold text-zinc-900">
                          {typeof rest.name === "object"
                            ? rest.name.en
                            : rest.name}
                        </p>
                      </td>
                      <td className="py-4 px-6 text-center font-medium">
                        {rest.total_items}
                      </td>
                      <td className="py-4 px-6 text-center font-medium text-green-600">
                        {rest.available_items}
                      </td>
                      <td className="py-4 px-6 text-center font-bold">
                        {hasOut ? (
                          <span className="inline-flex items-center gap-1 text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                            <AlertCircle className="w-4 h-4" />{" "}
                            {rest.out_of_stock_items}
                          </span>
                        ) : (
                          <span className="text-zinc-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
