/** Базовый публичный URL для canonical, OG, sitemap и robots. */
export function getSiteUrl(): URL {
  const raw =
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "http://localhost:3000";
  const withProto = raw.startsWith("http") ? raw : `https://${raw}`;
  return new URL(withProto.replace(/\/$/, ""));
}
