import { auth } from "@/auth";
import { prisma } from "@/db/client";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

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
  const text = typeof b.text === "string" ? b.text.trim() : "";
  const createdAtMs = typeof b.createdAt === "number" ? b.createdAt : Number(b.createdAt);

  if (!text || !Number.isFinite(createdAtMs)) {
    return NextResponse.json(
      { error: "text and createdAt (number) are required" },
      { status: 400 },
    );
  }

  // Resolve book: prefer bookId, then bookTitle, then auto-create
  let bookId: string;
  let bookTitle: string;

  if (typeof b.bookId === "string" && b.bookId) {
    const book = await prisma.book.findFirst({ where: { id: b.bookId, userId } });
    if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });
    bookId = book.id;
    bookTitle = book.title;
  } else if (typeof b.bookTitle === "string" && b.bookTitle.trim()) {
    const title = b.bookTitle.trim();
    const existing = await prisma.book.findFirst({
      where: { userId, title: { equals: title, mode: "insensitive" } },
    });
    if (existing) {
      bookId = existing.id;
      bookTitle = existing.title;
    } else {
      const created = await prisma.book.create({ data: { title, userId } });
      bookId = created.id;
      bookTitle = created.title;
    }
  } else {
    const autoTitle = text.slice(0, 30).trim() || "Untitled Book";
    const book = await prisma.book.create({ data: { title: autoTitle, userId } });
    bookId = book.id;
    bookTitle = book.title;
  }

  // Resolve chapter: explicit or auto-increment
  let chapter: number;
  if (typeof b.chapter === "number" && Number.isInteger(b.chapter) && b.chapter > 0) {
    // Check uniqueness
    const conflict = await prisma.transcription.findUnique({
      where: { bookId_chapter: { bookId, chapter: b.chapter } },
    });
    if (conflict) {
      return NextResponse.json(
        { error: `Chapter ${b.chapter} already exists in this book` },
        { status: 409 },
      );
    }
    chapter = b.chapter;
  } else {
    const lastChapter = await prisma.transcription.aggregate({
      where: { bookId },
      _max: { chapter: true },
    });
    chapter = (lastChapter._max.chapter ?? 0) + 1;
  }

  const row = await prisma.transcription.create({
    data: {
      text,
      chapter,
      createdAt: new Date(createdAtMs),
      bookId,
      userId,
    },
  });

  return NextResponse.json({ id: row.id, bookId, bookTitle, chapter });
}
