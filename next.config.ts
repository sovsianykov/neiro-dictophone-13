import type { NextConfig } from "next";

// next-pwa is CommonJS; keep dynamic require for compatibility with Next config loading.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
}) as (config: NextConfig) => NextConfig;

const nextConfig: NextConfig = {
  // Next 16: Turbopack по умолчанию; next-pwa вешает webpack — без этого ключ dev падает с ошибкой.
  turbopack: {},
  async redirects() {
    return [{ source: "/favicon.ico", destination: "/icon", permanent: false }];
  },
};

export default withPWA(nextConfig);
