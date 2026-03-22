import { restaurantsApi } from "@/lib/api";
import ClientMenu from "@/app/[locale]/restaurants/[id]/ClientMenu";
import { notFound } from "next/navigation";

export default async function RestaurantMenuPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  // parallel fetch
  const [restaurantRes, menuRes] = await Promise.all([
    restaurantsApi.get(id),
    restaurantsApi.getMenu(id),
  ]);

  if (restaurantRes.error || !restaurantRes.data) {
    notFound();
  }

  return (
    <ClientMenu
      restaurant={restaurantRes.data}
      menu={menuRes.data || []}
      locale={locale}
    />
  );
}
