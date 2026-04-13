import { restaurantsApi } from "@/lib/api";
import ClientWrapper from "@/app/[locale]/restaurants/ClientWrapper";
import { getTranslations } from "next-intl/server";

export default async function RestaurantsPage({
  searchParams,
  params,
}: {
  searchParams: {
    lat?: string;
    lng?: string;
    cuisine?: string;
    radius?: string;
    open_now?: string;
    open_between_start?: string;
    open_between_end?: string;
    tz?: string;
  };
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;

  const query = new URLSearchParams();
  if (sp.lat) query.append("lat", sp.lat);
  if (sp.lng) query.append("lng", sp.lng);
  query.append("radius", sp.radius || "5000"); // default radius
  if (sp.cuisine) query.append("cuisine", sp.cuisine);
  if (sp.open_now) query.append("open_now", sp.open_now);
  if (sp.open_between_start)
    query.append("open_between_start", sp.open_between_start);
  if (sp.open_between_end)
    query.append("open_between_end", sp.open_between_end);
  if (sp.tz) query.append("tz", sp.tz);

  // Fetch with explicit no-store (in Next.js App Router, using searchParams makes it dynamically rendered)
  const { data: restaurants } = await restaurantsApi.list(query.toString());

  return (
    <ClientWrapper
      initialRestaurants={restaurants || []}
      locale={locale}
      currentCuisine={sp.cuisine || ""}
    />
  );
}
