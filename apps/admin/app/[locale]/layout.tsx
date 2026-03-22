import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { NotificationProvider } from "@/contexts/NotificationContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Shoplift Admin",
  description: "Management portal for Shoplift",
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = await params;

  if (!["en", "tr"].includes(locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          <AdminAuthProvider>
            <NotificationProvider>{children}</NotificationProvider>
          </AdminAuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
