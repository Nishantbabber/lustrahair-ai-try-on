import type { Metadata, Viewport } from "next";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "LustraHair — AI Virtual Hair Try-On",
  description:
    "Upload a photo and discover how LustraHair premium styles look on you with AI-powered virtual try-on.",
  openGraph: {
    title: "LustraHair — AI Virtual Hair Try-On",
    description:
      "See your next look before you buy. AI-powered virtual try-on for premium human hair styles.",
    siteName: "LustraHair",
    locale: "en_US",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#faf8f5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
