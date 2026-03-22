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
