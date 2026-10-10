import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { SITE } from "@/lib/config";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap", axes: ["opsz"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: "Red23 | Elite Health Products | Natural Health Supplements", template: "%s | Red23" },
  description: "Welcome to Red23, an online shop featuring the finest natural health supplements & the best health products. Feel nourished & stay charged with us!",
  openGraph: { siteName: "Red23 Elite Health Products", type: "website", images: ["/images/logo.png"] },
  icons: { icon: "/images/favicon.png" },
};

export const viewport: Viewport = { themeColor: "#C2D3C0", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
