import { auth } from "@/auth";
import { prisma } from "@/db/client";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const books = await prisma.book.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      transcriptions: {
        orderBy: { chapter: "asc" },
        select: { id: true, text: true, chapter: true, createdAt: true },
      },
    },
  });

  return NextResponse.json(books);
}

/** Find-or-create a book by title for the authenticated user. */
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

  const title =
    typeof (body as Record<string, unknown>).title === "string"
      ? ((body as Record<string, unknown>).title as string).trim()
      : "";

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  // Case-insensitive search for existing book
  const existing = await prisma.book.findFirst({
    where: { userId, title: { equals: title, mode: "insensitive" } },
  });

  if (existing) {
    return NextResponse.json(existing);
  }

  const book = await prisma.book.create({ data: { title, userId } });
  return NextResponse.json(book, { status: 201 });
}
