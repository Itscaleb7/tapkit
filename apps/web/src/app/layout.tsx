import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "@fontsource/dm-serif-display/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { site } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "TapKit — Build your personal brand from zero", template: "%s · TapKit" },
  description: "Discover what you should be known for, turn your real experiences into content, learn from your results and build toward real opportunities.",
  icons: { icon: "/icon.png", apple: "/apple-touch-icon.png" },
  openGraph: { type: "website", siteName: "TapKit", title: "TapKit — Build your personal brand from zero", description: "The personal brand app for people starting from zero." },
};

export const viewport: Viewport = { themeColor: "#FF6A13", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
