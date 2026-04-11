import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "@/providers";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/app/api/uploadthing/core";
import { Analytics } from "@vercel/analytics/next";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "https://landil.so"),
  title: {
    default: "Landil – Land Due Diligence and Marketplace in the Philippines",
    template: "%s | Landil",
  },
  description:
    "Landil brings together land analysis and a marketplace registry for buyers and sellers in the Philippines. Check LRA titles, run BIR zonal value simulations, compare bids, and close faster.",
  keywords: [
    "land for sale Philippines",
    "land due diligence Philippines",
    "LRA title check",
    "BIR zonal value",
    "Cebu land listings",
    "Iloilo land listings",
    "real estate marketplace Philippines",
    "property registry Philippines",
  ],
  openGraph: {
    type: "website",
    siteName: "Landil",
    title: "Landil – Land Due Diligence and Marketplace in the Philippines",
    description:
      "One platform for land due diligence, offer aggregation, and negotiations. Buyers check risks fast. Sellers see all bids and set prices based on market data.",
    locale: "en_PH",
  },
  twitter: {
    card: "summary_large_image",
    title: "Landil – Land Due Diligence and Marketplace in the Philippines",
    description:
      "One platform for land due diligence, offer aggregation, and negotiations. Buyers check risks fast. Sellers see all bids and set prices based on market data.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-PH" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
