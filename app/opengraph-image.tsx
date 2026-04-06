import { OgBrandBanner } from "@/lib/og-brand";
import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<OgBrandBanner />, { ...size });
}
