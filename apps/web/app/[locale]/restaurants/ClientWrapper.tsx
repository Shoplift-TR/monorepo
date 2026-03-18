"use client";

import React, { useEffect } from "react";
import { Restaurant } from "@shoplift/types";
import { useTranslations } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";

interface ClientWrapperProps {
  initialRestaurants: Restaurant[];
  locale: string;
  currentCuisine: string;
}

const CUISINES = ["Burger", "Pizza", "Doner", "Sushi", "Healthy", "Vegan"];

export default function ClientWrapper({
  initialRestaurants,
  locale,
  currentCuisine,
}: ClientWrapperProps) {
  const t = useTranslations("restaurants");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // On mount, grab geolocation if not already in URL
  useEffect(() => {
    if (!searchParams.has("lat") || !searchParams.has("lng")) {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("lat", pos.coords.latitude.toString());
            params.set("lng", pos.coords.longitude.toString());
            params.set("radius", "5000"); // 5km radius
            router.replace(`${pathname}?${params.toString()}`);
          },
          (err) => {
            console.warn("Geolocation denied or error", err);
          },
        );
      }
    }
  }, [searchParams, pathname, router]);

  const handleCuisineClick = (cuisine: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentCuisine === cuisine) {
      params.delete("cuisine");
    } else {
      params.set("cuisine", cuisine);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      {/* Hero Header */}
      <div className="bg-[#E2103C] pt-6 pb-6 px-4">
        {/* Search Bar */}
        <div className="relative w-full max-w-[390px] mx-auto hidden sm:block">
          {/* Mobile view restricts width below max-w-[390px], generic container */}
        </div>
        <div className="w-full max-w-[390px] mx-auto">
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            className="w-full h-12 bg-white rounded-[24px] px-5 pl-12 text-sm text-zinc-900 outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-[390px] mx-auto pt-6 px-4">
        <h2 className="text-xl font-bold text-zinc-900 mb-4 tracking-tight">
          {t("popularSearches")}
        </h2>

        {/* Categories Chips */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 mb-6">
          {CUISINES.map((cuisine) => {
            const isActive = currentCuisine === cuisine;
            return (
              <button
                key={cuisine}
                onClick={() => handleCuisineClick(cuisine)}
                className={`flex-shrink-0 px-4 py-2 rounded-[20px] text-sm font-medium border transition-colors ${
                  isActive
                    ? "border-[#E2103C] bg-[#FFF0F3] text-[#E2103C]"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {cuisine}
              </button>
            );
          })}
        </div>

        {/* Restaurant List */}
        <div className="flex flex-col gap-6">
          {initialRestaurants.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 font-medium">
              {t("noRestaurants")}
            </div>
          ) : (
            initialRestaurants.map((res) => (
              <RestaurantCard
                key={res.id}
                restaurant={res}
                locale={locale}
                t={t}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function RestaurantCard({
  restaurant,
  locale,
  t,
}: {
  restaurant: Restaurant;
  locale: string;
  t: any;
}) {
  const name =
    (restaurant.name as any)[locale] || restaurant.name["tr"] || "Restaurant";
  const desc =
    (restaurant.description as any)[locale] ||
    restaurant.description["tr"] ||
    "";
  const shortDesc = desc.length > 80 ? desc.substring(0, 80) + "..." : desc;

  // Render dummy delivery time, using generic mapping
  const minOrderStr = t("minOrder", { amount: "₺" + 150 });

  return (
    <Link href={`/${locale}/restaurants/${restaurant.id}`} className="block">
      <div className="w-full bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
        {/* Hero Image */}
        <div className="relative w-full h-40 bg-zinc-200">
          {/* using standard img since next/image needs remote patterns configured */}
          <img
            src={
              restaurant.logo ||
              "https://placehold.co/400x200/eee/999?text=Image"
            }
            alt={name}
            className="w-full h-full object-cover"
          />
          {/* Heart placeholder top right */}
          <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow flex items-center justify-center">
            <svg
              className="w-4 h-4 text-zinc-500 hover:text-[#E2103C] cursor-pointer"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-bold text-[16px] text-zinc-900 leading-tight">
              {name}
            </h3>
            <div className="flex items-center gap-1 bg-zinc-100 px-2 py-0.5 rounded-full">
              <span className="text-[#FFB800] text-sm">★</span>
              <span className="text-xs font-bold text-zinc-800">
                {restaurant.rating?.toFixed(1) || "New"}
              </span>
            </div>
          </div>

          <p className="text-[13px] text-zinc-500 mb-2">{shortDesc}</p>

          <div className="flex items-center gap-3 text-xs text-zinc-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
            <span>
              {(restaurant as any).distanceMeters
                ? `${((restaurant as any).distanceMeters / 1000).toFixed(1)} km`
                : "—"}
            </span>
            <span>•</span>
            <span>{t("deliveryTime", { min: "25", max: "35" })}</span>
            <span>•</span>
            <span>{minOrderStr}</span>
            {restaurant.cuisineTags && restaurant.cuisineTags.length > 0 && (
              <>
                <span>•</span>
                <span className="truncate">
                  {restaurant.cuisineTags.join(", ")}
                </span>
              </>
            )}
          </div>

          {/* Badges row */}
          <div className="mt-3 flex gap-2">
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-[#E8F8F0] text-[#00A651] rounded-md text-[11px] font-bold">
              {t("freeDelivery")}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
