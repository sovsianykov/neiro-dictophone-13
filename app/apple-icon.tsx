import { OgBrandSquare } from "@/lib/og-brand";
import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<OgBrandSquare size={180} />, { ...size });
}
