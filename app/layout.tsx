import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "The AI Sommelier", description: "A host-led blind wine tasting for eight wines." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#521b2e" };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
 return <html lang="en"><body>{children}</body></html>;
}
