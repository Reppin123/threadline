import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const display = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-display", display: "swap" });

const APP_URL = process.env.APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: "Threadline — Your app, on iMessage", template: "%s · Threadline" },
  description: "Turn your website, API or idea into an AI agent customers can text on iMessage, Telegram and WhatsApp. Built, tested on simulated customers, and live in minutes.",
  applicationName: "Threadline",
  openGraph: { type: "website", siteName: "Threadline", title: "Threadline — Your app, on iMessage", description: "Blue bubbles for your business. Build an AI agent from your site, API or idea and put it on iMessage, Telegram and WhatsApp.", url: "/" },
  twitter: { card: "summary_large_image", title: "Threadline — Your app, on iMessage", description: "Blue bubbles for your business." },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#f6f5f1", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
