import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "sonner";
import Navbar from "@/components/Navbar";
import "../globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
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
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!["en", "tr"].includes(locale)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = (await getMessages()) as any;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${plusJakartaSans.variable} antialiased font-sans`}>
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <AuthProvider>
              <CartProvider>
                <Navbar />
                <main className="pt-20">{children}</main>
              </CartProvider>
            </AuthProvider>
          </NextIntlClientProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "var(--surface-container-lowest)",
                color: "var(--on-surface)",
                border: "1px solid rgba(146,252,64,0.2)",
                fontFamily: "Plus Jakarta Sans, sans-serif",
                fontSize: "0.875rem",
                fontWeight: "500",
              },
              className: "shoplift-toast",
            }}
            richColors
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
