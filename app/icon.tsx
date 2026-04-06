import { OgBrandSquare } from "@/lib/og-brand";
import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<OgBrandSquare size={32} />, { ...size });
}
