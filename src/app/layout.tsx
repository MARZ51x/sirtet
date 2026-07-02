import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import BackgroundLayer from "@/components/BackgroundLayer";
import Header from "@/components/Header";
import { SettingsProvider } from "@/lib/settings/SettingsProvider";
import { PRE_PAINT_SNIPPET } from "@/lib/theme/themes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Sirtet — falling-block puzzle",
    template: "%s · Sirtet",
  },
  description:
    "Sirtet is a fast, satisfying falling-block puzzle game with online leaderboards, custom themes, and three game modes.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0B0F1A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PRE_PAINT_SNIPPET }} />
      </head>
      <body className="min-h-full flex flex-col">
        <SettingsProvider>
          <BackgroundLayer />
          <Header />
          <main className="flex flex-1 flex-col">{children}</main>
          <footer className="flex h-10 items-center justify-center gap-4 border-t border-border/60 text-xs text-text-muted">
            <span>Sirtet</span>
            <Link href="/privacy" className="hover:text-text">
              Privacy
            </Link>
          </footer>
        </SettingsProvider>
      </body>
    </html>
  );
}
