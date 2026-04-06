import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const root = getSiteUrl().origin;
  const ts = new Date();
  return [
    { url: `${root}/`, lastModified: ts, changeFrequency: "weekly", priority: 1 },
    { url: `${root}/login`, lastModified: ts, changeFrequency: "monthly", priority: 0.5 },
    { url: `${root}/register`, lastModified: ts, changeFrequency: "monthly", priority: 0.5 },
  ];
}
