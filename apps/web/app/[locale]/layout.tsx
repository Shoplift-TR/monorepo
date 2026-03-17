import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Shoplift",
  description: "Campus Food Delivery Platform",
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!["en", "tr"].includes(locale)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <header className="fixed top-0 w-full p-4 flex justify-between items-center bg-white/80 backdrop-blur-md z-10 border-b">
            <div className="font-bold text-xl tracking-tighter">SHOPLIFT</div>
            <nav className="flex gap-4 items-center">
              <a
                href={`/${locale === "en" ? "tr" : "en"}`}
                className="text-sm font-medium px-3 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors uppercase"
              >
                {locale === "en" ? "TR" : "EN"}
              </a>
            </nav>
          </header>
          <main className="pt-20">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
