import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart/cart";
import { AuthProvider } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Footer } from "@/components/layout/footer";
import { Tracker } from "@/components/tracking/tracker";

export const metadata: Metadata = {
  title: { default: "Roque Santeiro Express — o grande mercado digital de Angola", template: "%s · Roque Santeiro Express" },
  description: "Compre de centenas de lojas angolanas num só lugar. Electrónica, moda, casa e muito mais com entrega em todo o país.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://roque-santeiro-express.netlify.app"),
};

export const viewport: Viewport = { themeColor: "#17365c", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-AO">
      <body className="min-h-dvh">
        <AuthProvider>
          <CartProvider>
            <Header />
            <main className="mx-auto w-full max-w-7xl px-3 pb-28 sm:px-5 md:pb-12">{children}</main>
            <Footer />
            <BottomNav />
            <Tracker />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
