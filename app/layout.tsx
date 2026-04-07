import { Providers } from "@/components/providers";
import { Starfield } from "@/components/starfield";
import { IntroScreen } from "@/components/intro-screen";
import { getSiteUrl } from "@/lib/site";
import type { Metadata, Viewport } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const site = getSiteUrl();
const title = "Нейро-диктофон — офлайн PWA с распознаванием речи";
const description =
  "Диктофон в браузере: Web Speech API, офлайн-хранилище IndexedDB, синхронизация расшифровок с PostgreSQL. Вход по email, PWA и тёмный бизнес-интерфейс.";

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
  keywords: ["диктофон", "распознавание речи", "speech to text", "PWA", "IndexedDB", "офлайн"],
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
  twitter: { card: "summary_large_image", title, description },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Диктофон",
  },
  formatDetection: { telephone: false },
  category: "productivity",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a0e1a" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0e1a" },
  ],
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${manrope.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="neo-bg neo-grid min-h-full flex flex-col text-foreground">
        <Starfield />
        <IntroScreen />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
