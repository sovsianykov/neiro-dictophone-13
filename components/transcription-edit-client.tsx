"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { buildFilename } from "@/lib/filename";

type TranscriptionData = {
  id: string;
  text: string;
  chapter: number;
  createdAt: string;
  book: { id: string; title: string };
};

type FormValues = {
  text: string;
  chapter: number;
};

export function TranscriptionEditClient({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bookTitle, setBookTitle] = useState("");
  const [currentChapter, setCurrentChapter] = useState<number | null>(null);
  const [notFound, setNotFound] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/transcriptions/${id}`);
        if (!res.ok) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const data = (await res.json()) as TranscriptionData;
        if (!cancelled) {
          setBookTitle(data.book.title);
          setCurrentChapter(data.chapter);
          reset({ text: data.text, chapter: data.chapter });
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, reset]);

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/transcriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("save failed");
      toast.success("Сохранено");
      router.push("/files");
    } catch {
      toast.error("Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="relative z-10 flex min-h-full items-center justify-center pb-28">
        <p className="font-mono text-sm text-orange-600/80">Загрузка…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-4 py-20 pb-28 text-center">
        <p className="text-stone-600">Расшифровка не найдена.</p>
        <Link href="/files" className="neo-btn-ghost rounded-xl px-4 py-2.5 text-sm font-medium">
          ← К файлам
        </Link>
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 pb-28">
      <div className="flex items-center gap-3">
        <Link
          href="/files"
          className="neo-btn-ghost rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-white/80"
          aria-label="Назад к файлам"
        >
          ←
        </Link>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-orange-600/90">Редактирование</p>
          <h1 className="bg-gradient-to-r from-orange-500 via-rose-500 to-amber-400 bg-clip-text text-xl font-semibold tracking-tight text-transparent">
            {bookTitle}
          </h1>
          {currentChapter !== null && (
            <p className="font-mono text-xs text-stone-500">
              {buildFilename(bookTitle, currentChapter)}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="neo-panel rounded-2xl p-6 flex flex-col gap-4">
          {/* Chapter */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="chapter" className="font-mono text-xs uppercase tracking-wider text-orange-600">
              Глава
            </label>
            <input
              id="chapter"
              type="number"
              min={1}
              className="w-28 rounded-xl border border-orange-200 bg-white/95 px-3 py-2 text-sm text-stone-800 shadow-sm outline-none ring-orange-300/40 focus:ring-2"
              {...register("chapter", {
                required: "Укажите номер главы",
                valueAsNumber: true,
                min: { value: 1, message: "Глава должна быть ≥ 1" },
              })}
            />
            {errors.chapter && (
              <p className="text-xs text-rose-600">{errors.chapter.message}</p>
            )}
          </div>

          {/* Text */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="text" className="font-mono text-xs uppercase tracking-wider text-orange-600">
              Текст расшифровки
            </label>
            <textarea
              id="text"
              rows={10}
              className="rounded-2xl border border-orange-200 bg-white/95 px-4 py-3 font-mono text-sm leading-relaxed text-stone-800 shadow-sm outline-none ring-orange-300/40 focus:ring-2 resize-y"
              {...register("text", { required: "Текст не может быть пустым" })}
            />
            {errors.text && (
              <p className="text-xs text-rose-600">{errors.text.message}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || !isDirty}
            className="neo-btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45"
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
          <Link
            href="/files"
            className="neo-btn-ghost rounded-xl px-5 py-2.5 text-sm font-semibold transition hover:bg-white/80"
          >
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
