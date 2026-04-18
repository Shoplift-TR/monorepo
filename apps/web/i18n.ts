import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";

// Can be imported from a shared config
const locales = ["en", "tr"];
const defaultLocale = "tr";

export default getRequestConfig(async ({ requestLocale }) => {
  // requestLocale can be undefined during some startup/render edge-cases;
  // fall back instead of forcing notFound (which surfaces as 404).
  const requested = await requestLocale;
  const locale =
    requested && locales.includes(requested) ? requested : defaultLocale;

  if (!locales.includes(locale)) notFound();

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
