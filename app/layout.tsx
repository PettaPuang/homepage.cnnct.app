import type { Metadata, Viewport } from "next";
import Image from "next/image";
import { DM_Mono, Inter } from "next/font/google";

import { SiteNav } from "@/components/site/site-nav";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://cnnct.app"),
  title: "CNNCT — Digital ERP Studio",
  description:
    "A minimal homepage framework for CNNCT digital ERP products and services.",
  applicationName: "CNNCT",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${dmMono.variable}`}>
      <body>
        <a className="home-mark" href="#" aria-label="CNNCT home">
          <Image
            src="/icon/CNNCT Logotype White.png"
            alt=""
            width={1024}
            height={172}
            loading="eager"
            sizes="(min-width: 1920px) 96px, (min-width: 1440px) 5vw, 72px"
          />
        </a>
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
