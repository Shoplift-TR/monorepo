"use client";

import { useState, useEffect } from "react";
import { adminApi } from "@/lib/api";
import { TrendingUp, ShoppingBag, Banknote, Star } from "lucide-react";

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("weekly");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const { data } = await adminApi.getAnalytics(period);
    if (data) {
      setData(data); // MOCK FOR NOW API actually needs to return this shape
    } else {
      // Mock data for display purposes
      setData({
        totalOrders: 200 * (period === "weekly" ? 1 : 4),
        totalRevenue: 50000 * (period === "weekly" ? 1 : 4),
        averageOrderValue: 250,
        popularItem: "Adana Kebab (45 orders)",
      });
    }
    setLoading(false);
  };

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-[16px] border border-zinc-100 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-[13px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
          {title}
        </p>
        <p className="text-3xl font-black text-zinc-900">{value}</p>
      </div>
      <div className={`p-3 rounded-[12px] ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-2xl font-bold text-zinc-900">
          Dashboard Analytics
        </h1>

        <div className="flex bg-zinc-200/50 p-1 rounded-[12px]">
          {["daily", "weekly", "monthly"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`
                px-4 py-2 rounded-[8px] text-sm font-bold capitalize transition-all
                ${period === p ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}
              `}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-zinc-500">Loading data...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatCard
              title="Total Orders"
              value={data.totalOrders?.toLocaleString("tr-TR")}
              icon={ShoppingBag}
              color="bg-blue-50 text-blue-600"
            />
            <StatCard
              title="Gross Revenue"
              value={`₺${data.totalRevenue?.toLocaleString("tr-TR")}`}
              icon={Banknote}
              color="bg-green-50 text-green-600"
            />
            <StatCard
              title="Avg Order Value"
              value={`₺${data.averageOrderValue?.toLocaleString("tr-TR")}`}
              icon={TrendingUp}
              color="bg-purple-50 text-purple-600"
            />
            <StatCard
              title="Top Item"
              value={data.popularItem.split(" ")[0]}
              icon={Star}
              color="bg-orange-50 text-orange-600"
            />
          </div>

          <div className="bg-white p-8 rounded-[16px] border border-zinc-100 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900 mb-6">
              Orders Over Time
            </h2>
            <div className="h-[300px] flex items-end gap-2 p-4 border-b border-l border-zinc-100">
              {/* 纯CSS条形图 Mock */}
              {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-2 group"
                >
                  <div
                    className="w-full bg-[#E2103C]/80 hover:bg-[#E2103C] rounded-t-md transition-all relative"
                    style={{ height: `${h}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded transition-opacity">
                      {h * 10} Orders
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block mt-2">
                    Day {i + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
