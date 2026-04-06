import { OgBrandSquare } from "@/lib/og-brand";
import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(<OgBrandSquare size={192} />, { width: 192, height: 192 });
}
