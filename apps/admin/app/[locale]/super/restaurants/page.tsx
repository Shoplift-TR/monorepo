"use client";

import { useState, useEffect } from "react";
import { adminApi } from "@/lib/api";
import { Plus, Edit2, X } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRest, setEditingRest] = useState<any>(null);

  // Form State
  const [form, setForm] = useState<any>({
    nameTr: "",
    nameEn: "",
    descTr: "",
    descEn: "",
    email: "",
    commissionRate: 0.1,
    maintenanceFee: 0,
    lat: 0,
    lng: 0,
    address: "",
    slug: "",
    deliveryFee: 0,
    logo: "",
    restaurantAdminEmail: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await adminApi.getRestaurants();
    if (data) setRestaurants(data);
    setLoading(false);
  };

  const openDrawer = (rest?: any) => {
    if (rest) {
      setEditingRest(rest);
      setForm({
        nameTr: rest.name.tr || "",
        nameEn: rest.name.en || "",
        descTr: rest.description.tr || "",
        descEn: rest.description.en || "",
        email: rest.ownerEmail || "", // Ideally fetched
        commissionRate: rest.commission_rate,
        maintenanceFee: rest.maintenance_fee,
        lat: rest.location?.coordinates?.[1] || 0,
        lng: rest.location?.coordinates?.[0] || 0,
        address: rest.address || "",
        slug: rest.slug || "",
        deliveryFee: Number(rest.deliveryFee || 0),
        logo: rest.logo || "",
        restaurantAdminEmail: "", // Not returned by API, only used for update
      });
    } else {
      setEditingRest(null);
      setForm({
        nameTr: "",
        nameEn: "",
        descTr: "",
        descEn: "",
        email: "",
        commissionRate: 0.1,
        maintenanceFee: 0,
        lat: 0,
        lng: 0,
        address: "",
      });
    }
    setDrawerOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: { tr: form.nameTr, en: form.nameEn },
      description: { tr: form.descTr, en: form.descEn },
      owner_email: form.email,
      cuisine_tags: [],
      commission_rate: Number(form.commissionRate),
      maintenance_fee: Number(form.maintenanceFee),
      location: { lat: Number(form.lat), lng: Number(form.lng) },
      address: form.address,
      slug: form.slug,
      delivery_fee: Number(form.deliveryFee),
      logo: form.logo,
      restaurant_admin_email: form.restaurantAdminEmail || undefined,
      operating_hours: { monday: { open: "09:00", close: "22:00" } },
    };

    // Filter out undefined and empty strings
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(
        ([_, v]) => v !== undefined && v !== "" && v !== null,
      ),
    );

    if (editingRest) {
      const { data } = await adminApi.updateRestaurant(
        editingRest.id,
        cleanPayload,
      );
      if (data) fetchData();
    } else {
      const { data } = await adminApi.onboardRestaurant(cleanPayload as any);
      if (data) fetchData();
    }
    setDrawerOpen(false);
  };

  if (loading) return <div className="p-8">Loading restaurants...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Restaurants</h1>
        <button
          onClick={() => openDrawer()}
          className="flex items-center gap-2 px-6 h-10 rounded-[24px] bg-[#E2103C] text-white font-bold text-sm shadow-md"
        >
          <Plus className="w-4 h-4" /> Onboard Restaurant
        </button>
      </div>

      <div className="bg-white rounded-[12px] border border-zinc-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F9F9F9] border-b border-zinc-100">
              <th className="py-3 px-6 text-xs font-bold text-zinc-500 uppercase">
                Name
              </th>
              <th className="py-3 px-6 text-xs font-bold text-zinc-500 uppercase">
                Comm. Rate
              </th>
              <th className="py-3 px-6 text-xs font-bold text-zinc-500 uppercase">
                Health Score
              </th>
              <th className="py-3 px-6 text-xs font-bold text-zinc-500 uppercase">
                Orders
              </th>
              <th className="py-3 px-6 text-xs font-bold text-zinc-500 uppercase">
                Status
              </th>
              <th className="py-3 px-6 text-xs font-bold text-zinc-500 uppercase text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((r, idx) => (
              <tr
                key={r.id}
                className={`${idx !== 0 ? "border-t border-zinc-100/50" : ""}`}
              >
                <td className="py-4 px-6">
                  <p className="font-bold text-zinc-900">
                    {typeof r.name === "object" ? r.name.en : r.name}
                  </p>
                </td>
                <td className="py-4 px-6 text-zinc-700">
                  {(r.commission_rate * 100).toFixed(1)}%
                </td>
                <td className="py-4 px-6">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${r.health_score >= 70 ? "bg-green-100 text-green-800" : r.health_score >= 40 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}
                  >
                    {r.health_score || 100}/100
                  </span>
                </td>
                <td className="py-4 px-6 font-medium text-zinc-700">
                  {r.order_count || r.total_orders || 0}
                </td>
                <td className="py-4 px-6">
                  <span
                    className={`px-2 py-1 flex w-max items-center gap-1 rounded-full text-xs font-bold ${r.is_active ? "bg-green-50 text-green-600" : "bg-zinc-100 text-zinc-500"}`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${r.is_active ? "bg-green-500" : "bg-zinc-400"}`}
                    />
                    {r.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <button
                    onClick={() => openDrawer(r)}
                    className="p-2 rounded-md hover:bg-zinc-100 text-zinc-500 transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {editingRest ? "Edit Restaurant" : "Onboard Restaurant"}
              </h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-full hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="flex-1 overflow-y-auto p-6 space-y-4"
            >
              <div className="space-y-4">
                <input
                  placeholder="Name (EN)"
                  value={form.nameEn}
                  onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                  className="w-full h-10 px-3 border rounded-lg focus:outline-none focus:border-[#E2103C]"
                  required
                />
                <input
                  placeholder="Name (TR)"
                  value={form.nameTr}
                  onChange={(e) => setForm({ ...form, nameTr: e.target.value })}
                  className="w-full h-10 px-3 border rounded-lg focus:outline-none focus:border-[#E2103C]"
                  required
                />
                {!editingRest && (
                  <input
                    type="email"
                    placeholder="Owner Email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full h-10 px-3 border rounded-lg focus:outline-none focus:border-[#E2103C]"
                    required
                  />
                )}
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Commission Rate (e.g. 0.1)"
                    value={form.commissionRate}
                    onChange={(e) =>
                      setForm({ ...form, commissionRate: e.target.value })
                    }
                    className="w-full h-10 px-3 border rounded-lg focus:outline-none focus:border-[#E2103C]"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Maintenance Fee"
                    value={form.maintenanceFee}
                    onChange={(e) =>
                      setForm({ ...form, maintenanceFee: e.target.value })
                    }
                    className="w-full h-10 px-3 border rounded-lg focus:outline-none focus:border-[#E2103C]"
                    required
                  />
                </div>
                <input
                  placeholder="Address"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  className="w-full h-10 px-3 border rounded-lg focus:outline-none focus:border-[#E2103C]"
                  required
                />

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-2">
                    Restaurant Logo
                  </label>
                  <ImageUpload
                    onUpload={(url) => setForm({ ...form, logo: url })}
                    defaultValue={form.logo || ""}
                    bucket="images"
                    className="w-24 h-24 rounded-full bg-zinc-50 border-2 border-dashed 
                               border-zinc-200 flex flex-col items-center justify-center 
                               cursor-pointer hover:bg-zinc-100 transition-colors overflow-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">
                    URL Slug
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-400">
                      shoplift.com/restaurants/
                    </span>
                    <input
                      value={form.slug || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          slug: e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, "-")
                            .replace(/-+/g, "-"),
                        })
                      }
                      placeholder="restaurant-name"
                      className="flex-1 h-10 px-3 rounded-lg border border-zinc-200 text-sm 
                                 focus:border-[#E2103C] focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">
                      Delivery Fee (₺)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.deliveryFee ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          deliveryFee: Number(e.target.value),
                        })
                      }
                      className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-sm 
                                 focus:border-[#E2103C] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">
                      Health Score
                    </label>
                    <input
                      disabled
                      value={editingRest?.healthScore || 100}
                      className="w-full h-10 px-3 rounded-lg border border-zinc-50 bg-zinc-50 text-sm text-zinc-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">
                    Assign Restaurant Admin (email)
                  </label>
                  <input
                    value={form.restaurantAdminEmail || ""}
                    onChange={(e) =>
                      setForm({ ...form, restaurantAdminEmail: e.target.value })
                    }
                    placeholder="admin@restaurant.com"
                    className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-sm 
                               focus:border-[#E2103C] focus:outline-none"
                  />
                  <p className="text-xs text-zinc-400 mt-1">
                    Entering an email will link that account to this restaurant.
                  </p>
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-zinc-100">
              <button
                onClick={handleSave}
                className="w-full h-12 bg-[#E2103C] text-white font-bold rounded-[24px]"
              >
                Save Restaurant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
