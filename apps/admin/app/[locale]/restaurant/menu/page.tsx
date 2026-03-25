"use client";

import React, { useState, useEffect } from "react";
import { adminApi } from "@/lib/api";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

export default function MenuManagementPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    setLoading(true);
    const { data } = await adminApi.getMenu();
    if (data) {
      setItems(data);
    }
    setLoading(false);
  };

  const handleToggleActive = async (item: any) => {
    const { data } = await adminApi.updateMenuItem(item.id, {
      is_available: !item.is_available,
    });
    if (data) {
      setItems(items.map((i) => (i.id === item.id ? data : i)));
    }
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditForm({
      ...item,
      nameTr: item.name.tr,
      nameEn: item.name.en,
      descTr: item.description.tr,
      descEn: item.description.en,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    setEditForm({});
  };

  const saveEdit = async () => {
    const payload = {
      name: { tr: editForm.nameTr, en: editForm.nameEn },
      description: { tr: editForm.descTr, en: editForm.descEn },
      price: Number(editForm.price),
      category: editForm.category,
      is_available: editForm.is_available ?? true,
      ...(editForm.imageUrl !== undefined && { image_url: editForm.imageUrl }),
    };

    if (isCreating) {
      const { data } = await adminApi.createMenuItem(payload);
      if (data) setItems([...items, data]);
    } else {
      const { data } = await adminApi.updateMenuItem(editingId!, payload);
      if (data) setItems(items.map((i) => (i.id === editingId ? data : i)));
    }
    cancelEdit();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this menu item?")) {
      await adminApi.deleteMenuItem(id);
      setItems(items.filter((i) => i.id !== id));
    }
  };

  // Group items by category
  const categories = Array.from(new Set(items.map((i) => i.category))).sort();

  if (loading) return <div className="p-8">Loading menu...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Menu & Inventory</h1>
        <button
          onClick={() => {
            setIsCreating(true);
            setEditingId("new");
            setEditForm({
              is_available: true,
              category: categories[0] || "General",
            });
          }}
          className="flex items-center gap-2 px-6 h-10 rounded-[24px] bg-[#E2103C] text-white font-bold text-sm shadow-md shadow-red-100 hover:bg-red-700 transition"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {isCreating && editingId === "new" && (
        <div className="bg-white p-6 rounded-[12px] border border-zinc-200 shadow-sm mb-8 space-y-4">
          <h2 className="font-bold text-lg text-zinc-900 border-b pb-2">
            New Menu Item
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1">
                Name (TR)
              </label>
              <input
                value={editForm.nameTr || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, nameTr: e.target.value })
                }
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-sm focus:border-[#E2103C] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1">
                Name (EN)
              </label>
              <input
                value={editForm.nameEn || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, nameEn: e.target.value })
                }
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-sm focus:border-[#E2103C] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1">
                Description (TR)
              </label>
              <input
                value={editForm.descTr || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, descTr: e.target.value })
                }
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-sm focus:border-[#E2103C] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1">
                Description (EN)
              </label>
              <input
                value={editForm.descEn || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, descEn: e.target.value })
                }
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-sm focus:border-[#E2103C] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1">
                Price (₺)
              </label>
              <input
                type="number"
                step="0.01"
                value={editForm.price || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, price: e.target.value })
                }
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-sm focus:border-[#E2103C] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1">
                Category
              </label>
              <input
                value={editForm.category || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, category: e.target.value })
                }
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-sm focus:border-[#E2103C] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-1">
              Item Image
            </label>
            <ImageUpload
              onUpload={(url) => setEditForm({ ...editForm, imageUrl: url })}
              defaultValue={editForm.imageUrl || ""}
              bucket="menu-images"
            />
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
            <button
              onClick={cancelEdit}
              className="px-4 h-10 rounded-lg text-zinc-500 font-bold hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              className="px-6 h-10 rounded-lg bg-[#E2103C] text-white font-bold hover:bg-red-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save
            </button>
          </div>
        </div>
      )}

      {categories.map((category) => (
        <div key={category} className="mb-10">
          <h2 className="text-xl font-black text-zinc-900 mb-4">{category}</h2>

          <div className="bg-white rounded-[12px] border border-zinc-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase">
                    Item
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase">
                    Price (₺)
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase">
                    Status
                  </th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items
                  .filter((i) => i.category === category)
                  .map((item, idx) => (
                    <React.Fragment key={item.id}>
                      <tr
                        className={`${idx !== 0 ? "border-t border-zinc-100" : ""} hover:bg-zinc-50/50 transition`}
                      >
                        <td className="py-4 px-4">
                          <p className="font-bold text-zinc-900">
                            {typeof item.name === "object"
                              ? item.name.en
                              : item.name}
                          </p>
                          <p className="text-xs text-zinc-500 truncate max-w-xs">
                            {typeof item.description === "object"
                              ? item.description.en
                              : item.description}
                          </p>
                        </td>
                        <td className="py-4 px-4 font-medium text-zinc-700">
                          {Number(item.price).toFixed(2)}
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => handleToggleActive(item)}
                            className={`px-3 py-1 rounded-full text-xs font-bold border transition ${item.is_available ? "bg-green-50 text-green-700 border-green-200" : "bg-zinc-100 text-zinc-500 border-zinc-200"}`}
                          >
                            {item.is_available ? "Active" : "Disabled"}
                          </button>
                        </td>
                        <td className="py-4 px-4 flex justify-end gap-2">
                          <button
                            onClick={() => startEdit(item)}
                            className="p-2 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      {editingId === item.id && !isCreating && (
                        <tr className="bg-zinc-50 border-t border-zinc-200">
                          <td colSpan={4} className="px-4 py-6">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <label className="block text-xs font-bold text-zinc-500 mb-1">
                                  Name (TR)
                                </label>
                                <input
                                  value={editForm.nameTr || ""}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      nameTr: e.target.value,
                                    })
                                  }
                                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-sm focus:border-[#E2103C] focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-zinc-500 mb-1">
                                  Name (EN)
                                </label>
                                <input
                                  value={editForm.nameEn || ""}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      nameEn: e.target.value,
                                    })
                                  }
                                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-sm focus:border-[#E2103C] focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-zinc-500 mb-1">
                                  Description (TR)
                                </label>
                                <input
                                  value={editForm.descTr || ""}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      descTr: e.target.value,
                                    })
                                  }
                                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-sm focus:border-[#E2103C] focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-zinc-500 mb-1">
                                  Description (EN)
                                </label>
                                <input
                                  value={editForm.descEn || ""}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      descEn: e.target.value,
                                    })
                                  }
                                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-sm focus:border-[#E2103C] focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-zinc-500 mb-1">
                                  Price (₺)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editForm.price || ""}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      price: e.target.value,
                                    })
                                  }
                                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-sm focus:border-[#E2103C] focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-zinc-500 mb-1">
                                  Category
                                </label>
                                <input
                                  value={editForm.category || ""}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      category: e.target.value,
                                    })
                                  }
                                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 text-sm focus:border-[#E2103C] focus:outline-none"
                                />
                              </div>
                            </div>
                            <div className="mb-4">
                              <label className="block text-xs font-bold text-zinc-500 mb-1">
                                Item Image
                              </label>
                              <ImageUpload
                                onUpload={(url) =>
                                  setEditForm({ ...editForm, imageUrl: url })
                                }
                                defaultValue={
                                  editForm.imageUrl || editForm.image_url || ""
                                }
                                bucket="menu-images"
                                className="w-full max-w-xs aspect-video bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-100 transition-colors overflow-hidden group"
                              />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200">
                              <button
                                onClick={cancelEdit}
                                className="px-4 h-10 rounded-lg text-zinc-500 font-bold hover:bg-zinc-100"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={saveEdit}
                                className="px-6 h-10 rounded-lg bg-[#E2103C] text-white font-bold hover:bg-red-700 flex items-center gap-2"
                              >
                                <Save className="w-4 h-4" /> Save
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
