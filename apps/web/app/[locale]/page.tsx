"use client";

import React, { useState } from "react";
import { Link, useRouter } from "@/lib/navigation";
import { useParams } from "next/navigation";
import {
  UtensilsCrossed,
  Star,
  Plus,
  Rocket,
  GraduationCap,
  CreditCard,
  Zap,
} from "lucide-react";

const MOCK_RESTAURANTS = [
  {
    id: "1",
    name: "The Scholarly Grill",
    cuisine: "Artisanal Burgers",
    rating: 4.9,
    deliveryTime: "15–25 min",
    deliveryFee: "TL 0 DELIVERY FEE",
    freeDelivery: true,
    tag: "MOST POPULAR",
  },
  {
    id: "2",
    name: "Campus Crust",
    cuisine: "Wood Fired Pizza",
    rating: 4.7,
    deliveryTime: "20–30 min",
    deliveryFee: "TL 0 DELIVERY FEE",
    freeDelivery: true,
    tag: "NEW",
  },
  {
    id: "3",
    name: "Library Sushi",
    cuisine: "Japanese",
    rating: 4.6,
    deliveryTime: "25–35 min",
    deliveryFee: "TL 0 DELIVERY FEE",
    freeDelivery: true,
    tag: "",
  },
  {
    id: "4",
    name: "The Caffeine Lab",
    cuisine: "Coffee & Bakery",
    rating: 5.0,
    deliveryTime: "5–15 min",
    deliveryFee: "TL 0.99 DELIVERY FEE",
    freeDelivery: false,
    tag: "MOST POPULAR",
  },
];

const CATEGORIES = [
  {
    name: "All Cuisines",
    icon: <UtensilsCrossed className="w-4 h-4" />,
    slug: "",
  },
  { name: "Burger", slug: "Burger" },
  { name: "Pizza", slug: "Pizza" },
  { name: "Sushi", slug: "Sushi" },
  { name: "Coffee", slug: "Coffee" },
  { name: "Vegan", slug: "Vegan" },
  { name: "Desserts", slug: "Desserts" },
];

export default function HomePage() {
  const { locale } = useParams();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("All Cuisines");

  const handleCategoryClick = (categoryName: string, slug: string) => {
    setActiveCategory(categoryName);
    if (slug) {
      router.push(`/restaurants?cuisine=${slug}`);
    } else {
      router.push(`/restaurants`);
    }
  };

  return (
    <div className="flex flex-col font-sans text-on-surface bg-surface min-h-screen">
      {/* HERO SECTION */}
      <section
        className="w-full pt-12 pb-24 px-6 md:px-12"
        style={{
          background: `
            radial-gradient(ellipse at 70% 50%, rgba(13,45,55,0.9) 0%, transparent 60%),
            radial-gradient(ellipse at 30% 80%, rgba(0,20,60,0.8) 0%, transparent 50%),
            linear-gradient(135deg, #080c24 0%, #0a1628 40%, #0d2137 70%, #091a2e 100%)
          `,
        }}
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col items-start gap-6">
            <span className="bg-[#92fc40] text-[#0b2000] text-[0.6875rem] font-bold uppercase tracking-[0.05em] px-3 py-1 rounded-full">
              CAMPUS EXCLUSIVE
            </span>
            <h1 className="text-white font-extrabold tracking-[-0.04em] text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.05]">
              Campus food, delivered fast.
            </h1>
            <p className="text-white/60 text-[0.9375rem] leading-[1.6] max-w-[380px]">
              Fuel your studies with the best local eats. Tailored specifically
              for the academic rhythm, because deadlines don't wait for hunger.
            </p>
            <div className="flex gap-4 mt-4">
              <Link
                href="/register"
                className="bg-[#92fc40] text-[#0b2000] font-bold rounded-full h-12 px-6 flex items-center justify-center transition-transform active:scale-95"
              >
                Get Started
              </Link>
              <Link
                href="/restaurants"
                className="bg-transparent border border-white/30 text-white font-medium rounded-full h-12 px-6 flex items-center justify-center transition-colors hover:bg-white/5 active:scale-95"
              >
                View Menus
              </Link>
            </div>

            {/* Stat Card */}
            <div className="mt-8 flex items-center gap-3 bg-white rounded-2xl p-4 shadow-[0_12px_24px_rgba(0,4,53,0.08)] self-end md:self-auto">
              <div className="w-10 h-10 rounded-full bg-[#92fc40]/20 flex items-center justify-center text-[#92fc40]">
                <Zap className="w-5 h-5 fill-[#92fc40]" />
              </div>
              <div>
                <div className="text-[#101744] font-bold text-sm">
                  12 Min Delivery
                </div>
                <div className="text-slate-500 text-[0.625rem] font-bold uppercase tracking-wider">
                  AVERAGE TIME
                </div>
              </div>
            </div>
          </div>

          <div className="relative group">
            <div
              className="aspect-[4/3] rounded-2xl overflow-hidden flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, #0f1e35 0%, #0a1628 50%, #061018 100%)",
              }}
            >
              <div className="w-full h-full bg-gradient-to-b from-white/5 to-black/40" />
              <div className="absolute inset-0 flex items-center justify-center text-white/10 font-bold text-2xl">
                <img
                  className="w-full h-full object-cover mix-blend-overlay opacity-80"
                  data-alt="Gourmet campus burger with fresh ingredients"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLFsSqbRGWf9sYKUXskW_RdskaBR6m-ME2PvRFchh7ASiWOSSDc_X0K_9F-IeLfV8TkYKCnBCPh7Tuoq1a39Ivh_-r5VQeoLVnl5D7g4Grqjd4nx7wF9rEviie_wGXAF3LxzfqhTLGX38vlFlxNV0aE5_5vBkypwxiYb_HfrEBtrEnj9Yzo0W8NHT2nECox9XqB2LHuJMJ1tuDMpN1XZqJ6PpMDOrSP2yHIDr25mOdNzYuAkvolxzjw7TpyTTAmUbQbLPeGpO9kz4"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORY FILTER ROW */}
      <section className="bg-surface py-8">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div
            className="flex gap-3 overflow-x-auto pb-4 scrollbar-none no-scrollbar"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                onClick={() => handleCategoryClick(cat.name, cat.slug)}
                className={`
                  flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-full text-[0.875rem] transition-all
                  ${
                    activeCategory === cat.name
                      ? "bg-[#92fc40] border-[#92fc40] text-[#0b2000] font-bold shadow-sm"
                      : "bg-[#f4f2ff] text-[#191c1d] font-medium hover:bg-[#dfe0ff]"
                  }
                `}
              >
                {cat.icon && cat.icon}
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* POPULAR NEAR YOU SECTION */}
      <section className="bg-surface pb-16">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-[#101744] font-extrabold text-[1.75rem] tracking-[-0.04em]">
                Popular near you
              </h2>
              <div className="h-[3px] w-10 bg-[#92fc40] mt-1" />
            </div>
            <Link
              href="/restaurants"
              className="text-[#101744] font-bold text-[0.875rem] flex items-center gap-1 hover:underline"
            >
              VIEW ALL →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {MOCK_RESTAURANTS.map((res) => (
              <div
                key={res.id}
                className="bg-white rounded-[12px] shadow-[0_12px_24px_rgba(0,4,53,0.08)] overflow-hidden relative group cursor-pointer"
              >
                <div className="h-[180px] w-full bg-gradient-to-b from-[#1a1f2e] to-[#2d3748] relative">
                  {res.tag && (
                    <div
                      className={`
                      absolute top-3 left-3 px-3 py-1 rounded-full text-[0.6875rem] font-bold uppercase tracking-[0.05em]
                      ${res.tag === "NEW" ? "bg-[#101744] text-white" : "bg-[#92fc40] text-[#0b2000]"}
                    `}
                    >
                      {res.tag}
                    </div>
                  )}
                </div>
                <div className="p-4 relative">
                  <h3 className="text-[#101744] font-bold text-[1rem]">
                    {res.name}
                  </h3>
                  <div className="flex items-center gap-1 text-[0.8125rem] text-[#5e5e5e] font-bold mt-1">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    <span>{res.rating}</span>
                    <span className="mx-1">•</span>
                    <span>{res.cuisine}</span>
                    <span className="mx-1">•</span>
                    <span>{res.deliveryTime}</span>
                  </div>
                  <div
                    className={`text-[0.8125rem] mt-2 font-bold ${res.freeDelivery ? "text-[#92fc40]" : "text-[#5e5e5e]"}`}
                  >
                    {res.deliveryFee}
                  </div>

                  <button className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-black flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110 active:scale-95">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURE STRIP */}
      <section className="bg-[#101744] py-16 px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 bg-[#92fc40]/15 rounded-xl flex items-center justify-center text-[#92fc40]">
              <Rocket className="w-6 h-6" />
            </div>
            <h3 className="text-white font-bold text-[1.25rem]">
              Fast Delivery
            </h3>
            <p className="text-white/60 text-[0.9375rem] leading-[1.6]">
              Lightning-quick transit paths mapped specifically for campus
              layouts. No more cold food at the library.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 bg-[#92fc40]/15 rounded-xl flex items-center justify-center text-[#92fc40]">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-white font-bold text-[1.25rem]">
              Campus Focused
            </h3>
            <p className="text-white/60 text-[0.9375rem] leading-[1.6]">
              Integrated with university IDs and dorm access points. We know
              exactly where your building is.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 bg-[#92fc40]/15 rounded-xl flex items-center justify-center text-[#92fc40]">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-white font-bold text-[1.25rem]">
              Easy Payment
            </h3>
            <p className="text-white/60 text-[0.9375rem] leading-[1.6]">
              Split bills with roommates instantly. Supports all major
              student-friendly payment methods.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="bg-[#101744] py-12 px-6 md:px-12 border-b border-white/5">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-white font-bold text-xl tracking-tighter">
              SHOPLIFT
            </div>
            <nav className="flex flex-wrap justify-center gap-6 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-white/50">
              <Link href="/en" className="hover:text-white transition-colors">
                ENGLISH
              </Link>
              <Link href="/tr" className="hover:text-white transition-colors">
                TÜRKÇE
              </Link>
              <Link
                href="/privacy"
                className="hover:text-white transition-colors"
              >
                PRIVACY POLICY
              </Link>
              <Link
                href="/terms"
                className="hover:text-white transition-colors"
              >
                TERMS OF SERVICE
              </Link>
            </nav>
          </div>
        </div>
        <div className="bg-[#0a0f1e] py-6 px-6 md:px-12">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="text-white font-extrabold text-sm tracking-wider">
              SHOPLIFT
            </div>
            <div className="text-white/40 text-[0.75rem]">© 2025 Shoplift</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
