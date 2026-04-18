"use client";

import { restaurantsApi } from "@/lib/api";
import ClientWrapper from "@/app/[locale]/restaurants/ClientWrapper";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function RestaurantsPage() {
  const params = useParams();
  const locale = params.locale as string;
  const searchParams = useSearchParams();

  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setLoading(true);
        setError(null);

        const query = new URLSearchParams();
        const lat = searchParams.get("lat");
        const lng = searchParams.get("lng");
        const radius = searchParams.get("radius");
        const cuisine = searchParams.get("cuisine");
        const openNow = searchParams.get("open_now");
        const openBetweenStart = searchParams.get("open_between_start");
        const openBetweenEnd = searchParams.get("open_between_end");
        const tz = searchParams.get("tz");

        if (lat) query.append("lat", lat);
        if (lng) query.append("lng", lng);
        query.append("radius", radius || "5000");
        if (cuisine) query.append("cuisine", cuisine);
        if (openNow) query.append("open_now", openNow);
        if (openBetweenStart)
          query.append("open_between_start", openBetweenStart);
        if (openBetweenEnd) query.append("open_between_end", openBetweenEnd);
        if (tz) query.append("tz", tz);

        const { data, error: apiError } = await restaurantsApi.list(
          query.toString(),
        );

        if (apiError) {
          setError(apiError);
          setRestaurants([]);
        } else {
          setRestaurants(data || []);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load restaurants");
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [searchParams]);

  const currentCuisine = searchParams.get("cuisine") || "";

  // Page renders immediately, data loads in background
  return (
    <ClientWrapper
      initialRestaurants={restaurants}
      locale={locale}
      currentCuisine={currentCuisine}
      isLoading={loading}
      error={error}
    />
  );
}
