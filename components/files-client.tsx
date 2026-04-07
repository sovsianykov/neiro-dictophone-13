"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { buildFilename } from "@/lib/filename";

type TranscriptionSummary = {
  id: string;
  text: string;
  chapter: number;
  createdAt: string;
};

type BookWithTranscriptions = {
  id: string;
  title: string;
  createdAt: string;
  transcriptions: TranscriptionSummary[];
};

export function FilesClient() {
  const [books, setBooks] = useState<BookWithTranscriptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [openBooks, setOpenBooks] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/books");
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as BookWithTranscriptions[];
        setBooks(data);
        if (data.length > 0 && data[0]) {
          setOpenBooks(new Set([data[0].id]));
        }
      } catch {
        toast.error("Не удалось загрузить файлы");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleBook = (bookId: string) => {
    setOpenBooks((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) next.delete(bookId);
      else next.add(bookId);
      return next;
    });
  };

  const grouped: Record<string, BookWithTranscriptions[]> = {};
  for (const book of books) {
    const letter = (book.title[0] ?? "#").toUpperCase();
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(book);
  }
  const sortedLetters = Object.keys(grouped).sort();

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 pb-28">
      <header className="flex items-center gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-indigo-400/80">Архив</p>
          <h1 className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-2xl font-semibold tracking-tight text-transparent">
            Файлы
          </h1>
        </div>
      </header>

      {loading && (
        <p className="font-mono text-sm text-indigo-400/80">Загрузка…</p>
      )}

      {!loading && books.length === 0 && (
        <div className="neo-panel rounded-2xl p-10 text-center text-sm text-slate-400">
          <p>Нет записей.</p>
          <Link
            href="/"
            className="mt-4 inline-block neo-btn-primary relative overflow-hidden rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            Начать запись
          </Link>
        </div>
      )}

      {sortedLetters.map((letter) => (
        <section key={letter} aria-label={`Группа ${letter}`}>
          <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500/60">
            {letter}
          </p>
          <ul className="flex flex-col gap-3" role="list">
            {grouped[letter]!.map((book) => {
              const isOpen = openBooks.has(book.id);
              return (
                <li key={book.id} className="neo-panel rounded-2xl overflow-hidden">
                  {/* Book header */}
                  <button
                    type="button"
                    onClick={() => toggleBook(book.id)}
                    className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-indigo-950/40"
                    aria-expanded={isOpen}
                    aria-controls={`book-${book.id}`}
                  >
                    <span className="text-xl" aria-hidden="true">
                      {isOpen ? "📂" : "📁"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-semibold text-slate-100">{book.title}</p>
                      <p className="text-xs text-slate-400">
                        {book.transcriptions.length}{" "}
                        {pluralChapters(book.transcriptions.length)}
                      </p>
                    </div>
                    <span className="text-slate-500 text-sm" aria-hidden="true">
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </button>

                  {/* Transcription list */}
                  {isOpen && (
                    <ul
                      id={`book-${book.id}`}
                      role="list"
                      className="border-t border-indigo-900/50 divide-y divide-indigo-900/40"
                    >
                      {book.transcriptions.length === 0 && (
                        <li className="px-5 py-3 text-sm text-slate-500 italic">Нет расшифровок</li>
                      )}
                      {book.transcriptions.map((t) => (
                        <li key={t.id} className="flex items-stretch">
                          <Link
                            href={`/transcriptions/${t.id}/edit`}
                            className="flex flex-1 items-start gap-3 px-5 py-3 transition hover:bg-indigo-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          >
                            <span className="mt-0.5 text-base" aria-hidden="true">📄</span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-mono text-xs text-indigo-400 mb-0.5">
                                {buildFilename(book.title, t.chapter)}
                              </p>
                              <p className="truncate text-sm text-slate-300 leading-relaxed">
                                {t.text.slice(0, 80)}{t.text.length > 80 ? "…" : ""}
                              </p>
                            </div>
                          </Link>
                          <Link
                            href={`/transcriptions/${t.id}/record`}
                            className="flex shrink-0 items-center px-3 text-indigo-400 transition hover:bg-indigo-950/60 hover:text-purple-300"
                            title="Продолжить запись"
                            aria-label="Продолжить запись"
                          >
                            🎙
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function pluralChapters(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 14) return "глав";
  if (n % 10 === 1) return "глава";
  if (n % 10 >= 2 && n % 10 <= 4) return "главы";
  return "глав";
}
