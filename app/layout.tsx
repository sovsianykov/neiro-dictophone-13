import { Providers } from "@/components/providers";
import { getSiteUrl } from "@/lib/site";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const site = getSiteUrl();
const title = "Нейро-диктофон — офлайн PWA с распознаванием речи";
const description =
  "Диктофон в браузере: Web Speech API, офлайн-хранилище IndexedDB, синхронизация расшифровок с PostgreSQL. Вход по email, PWA и светлый дружелюбный интерфейс.";

export const metadata: Metadata = {
  metadataBase: site,
  title: {
    default: title,
    template: "%s · Нейро-диктофон",
  },
  description,
  applicationName: "Нейро-диктофон",
  authors: [{ name: "Dictophone" }],
  generator: "Next.js",
  keywords: [
    "диктофон",
    "распознавание речи",
    "speech to text",
    "PWA",
    "IndexedDB",
    "офлайн",
    "Next.js",
    "синхронизация",
  ],
  referrer: "origin-when-cross-origin",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/icon", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: site.href,
    siteName: "Нейро-диктофон",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Диктофон",
  },
  formatDetection: { telephone: false },
  category: "productivity",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff7ed" },
    { media: "(prefers-color-scheme: dark)", color: "#ea580c" },
  ],
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="neo-bg neo-grid min-h-full flex flex-col text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
