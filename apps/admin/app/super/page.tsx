"use client";

import { useState, useEffect } from "react";
import { adminApi } from "@/lib/api";
import { Store, ShoppingBag, Banknote, Receipt } from "lucide-react";

export default function SuperAdminOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await adminApi.getOverview();
    if (data) setData(data);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-orange-100 text-orange-800";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800";
      case "PREPARING":
        return "bg-yellow-100 text-yellow-800";
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-zinc-100 text-zinc-800";
    }
  };

  if (loading) return <div className="p-8">Loading overview...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-zinc-900">Platform Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[12px] border border-zinc-100 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase">
              Active Restaurants
            </p>
            <p className="text-2xl font-black mt-2">
              {data?.active_restaurants || 0}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
            <Store className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-[12px] border border-zinc-100 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase">
              Delivered Orders
            </p>
            <p className="text-2xl font-black mt-2">
              {data?.total_delivered_orders || 0}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-[12px] border border-zinc-100 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase">
              Platform GMV
            </p>
            <p className="text-2xl font-black mt-2">
              ₺{data?.platform_gmv?.toFixed(2) || "0.00"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-[#E2103C]">
            <Banknote className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-[12px] border border-zinc-100 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-zinc-500 uppercase">
              Pending Refunds
            </p>
            <p className="text-2xl font-black mt-2">{0}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-zinc-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100">
          <h2 className="text-lg font-bold text-zinc-900">Recent Orders</h2>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F9F9F9] border-b border-zinc-100/50">
              <th className="py-3 px-6 text-xs font-bold text-zinc-500 uppercase">
                Order ID
              </th>
              <th className="py-3 px-6 text-xs font-bold text-zinc-500 uppercase">
                Restaurant
              </th>
              <th className="py-3 px-6 text-xs font-bold text-zinc-500 uppercase">
                Customer
              </th>
              <th className="py-3 px-6 text-xs font-bold text-zinc-500 uppercase">
                Total
              </th>
              <th className="py-3 px-6 text-xs font-bold text-zinc-500 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {(data?.recent_orders || [])
              .slice(0, 10)
              .map((order: any, idx: number) => (
                <tr
                  key={order.id}
                  className={`${idx !== 0 ? "border-t border-zinc-100/50" : ""}`}
                >
                  <td className="py-4 px-6 font-mono text-xs text-zinc-500">
                    {order.id.slice(0, 8)}
                  </td>
                  <td className="py-4 px-6 font-medium text-zinc-900">
                    {typeof order.restaurantName === "object"
                      ? order.restaurantName.en
                      : order.restaurantName}
                  </td>
                  <td className="py-4 px-6 text-zinc-600">
                    {order.customerName || "Customer"}
                  </td>
                  <td className="py-4 px-6 font-bold">
                    ₺{Number(order.total).toFixed(2)}
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            {(!data?.recent_orders || data.recent_orders.length === 0) && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-zinc-500">
                  No recent orders
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
