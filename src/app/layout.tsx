import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://junkymunky.com"),
  title: {
    default: "JunkyMunky — Hauling & Reuse Made Easy",
    template: "%s | JunkyMunky",
  },
  description:
    "Post junk removal jobs, get competitive bids from vetted removers, and pay safely with escrow — only after your junk is gone.",
  keywords: ["junk removal", "junk hauling", "furniture removal", "cleanout", "escrow", "marketplace"],
  alternates: {
    canonical: "https://junkymunky.com",
  },
  openGraph: {
    title: "JunkyMunky — Hauling & Reuse Made Easy",
    description: "Post a job, get bids, pay after pickup. The easiest way to get rid of junk.",
    siteName: "JunkyMunky",
    url: "https://junkymunky.com",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
