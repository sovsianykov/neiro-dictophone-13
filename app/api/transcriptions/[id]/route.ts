import { auth } from "@/auth";
import { prisma } from "@/db/client";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const row = await prisma.transcription.findFirst({
    where: { id, userId: session.user.id },
    include: { book: { select: { id: true, title: true } } },
  });

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const appendMode = b.append === true;
  const data: { text?: string; chapter?: number } = {};

  if (typeof b.text === "string") data.text = b.text.trim();
  if (typeof b.chapter === "number" && Number.isInteger(b.chapter) && b.chapter > 0) {
    data.chapter = b.chapter;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // Ensure the transcription belongs to this user
  const existing = await prisma.transcription.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Append mode: prepend existing text with a space
  if (appendMode && typeof data.text === "string" && data.text) {
    data.text = `${existing.text} ${data.text}`.trim();
  }

  const updated = await prisma.transcription.update({
    where: { id },
    data,
    include: { book: { select: { id: true, title: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.transcription.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, bookId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.transcription.delete({ where: { id } });

  // Delete the book if it has no more transcriptions
  const remaining = await prisma.transcription.count({ where: { bookId: existing.bookId } });
  if (remaining === 0) {
    await prisma.book.delete({ where: { id: existing.bookId } });
  }

  return new NextResponse(null, { status: 204 });
}
