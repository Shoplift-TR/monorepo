"use client";

import React, { useEffect, useRef } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";

maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_KEY || "";

interface MapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: { lat: number; lng: number; color?: string; label?: string }[];
  interactive?: boolean;
  className?: string;
  driverLocation?: { lat: number; lng: number }; // For live animation
}

export default function Map({
  center,
  zoom = 14,
  markers = [],
  interactive = true,
  className = "h-[300px] w-full rounded-xl overflow-hidden shadow-inner bg-zinc-100",
  driverLocation,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maptilersdk.Map | null>(null);
  const driverMarker = useRef<maptilersdk.Marker | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    if (!mapInstance.current) {
      mapInstance.current = new maptilersdk.Map({
        container: mapContainer.current,
        style: maptilersdk.MapStyle.STREETS,
        center: [center.lng, center.lat],
        zoom: zoom,
        interactive: interactive,
      });

      // Add static markers
      markers.forEach((m) => {
        new maptilersdk.Marker({ color: m.color || "#E2103C" })
          .setLngLat([m.lng, m.lat])
          .addTo(mapInstance.current!);
      });
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Handle live driver animation
  useEffect(() => {
    if (!mapInstance.current || !driverLocation) return;

    if (!driverMarker.current) {
      const el = document.createElement("div");
      el.className = "driver-marker";
      el.innerHTML = "🛵";
      el.style.fontSize = "24px";

      driverMarker.current = new maptilersdk.Marker({ element: el })
        .setLngLat([driverLocation.lng, driverLocation.lat])
        .addTo(mapInstance.current);
    }

    const startPos = driverMarker.current.getLngLat();
    const endPos = [driverLocation.lng, driverLocation.lat];
    let startTime: number | null = null;
    const duration = 2000; // 2s smooth move

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      const lng = startPos.lng + (endPos[0] - startPos.lng) * progress;
      const lat = startPos.lat + (endPos[1] - startPos.lat) * progress;

      driverMarker.current?.setLngLat([lng, lat]);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [driverLocation]);

  return <div ref={mapContainer} className={className} />;
}
