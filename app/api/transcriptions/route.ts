import { auth } from "@/auth";
import { prisma } from "@/db/client";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = typeof body === "object" && body !== null && "text" in body ? String((body as { text: unknown }).text) : "";
  const createdAtRaw =
    typeof body === "object" && body !== null && "createdAt" in body
      ? (body as { createdAt: unknown }).createdAt
      : undefined;

  const createdAtMs = typeof createdAtRaw === "number" ? createdAtRaw : Number(createdAtRaw);
  if (!text.trim() || !Number.isFinite(createdAtMs)) {
    return NextResponse.json({ error: "text and createdAt (number) are required" }, { status: 400 });
  }

  const row = await prisma.transcription.create({
    data: {
      text: text.trim(),
      createdAt: new Date(createdAtMs),
      userId: session.user.id,
    },
  });

  return NextResponse.json({ id: row.id });
}
