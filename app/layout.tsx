import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kingdom — Warring States Atlas",
  description: "Explore the seven Warring States in an interactive 3D political atlas inspired by Kingdom.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#101618" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
