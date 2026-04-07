"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { useSpeechRecognition, type SpeechLang } from "@/hooks/useSpeechRecognition";
import { buildFilename } from "@/lib/filename";

type TranscriptionData = {
  id: string;
  text: string;
  chapter: number;
  book: { id: string; title: string };
};

type Step = "review" | "recording" | "edit";

export function ContinueRecordingClient({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState<TranscriptionData | null>(null);

  const [lang, setLang] = useState<SpeechLang>("ru-RU");
  const { supported, liveText, error, start, stop, resetTranscript, setError } =
    useSpeechRecognition(lang);

  const [step, setStep] = useState<Step>("review");
  const [editedText, setEditedText] = useState("");
  const [saving, setSaving] = useState(false);

  const liveTextRef = useRef(liveText);
  useEffect(() => { liveTextRef.current = liveText; }, [liveText]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/transcriptions/${id}`);
        if (!res.ok) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const json = (await res.json()) as TranscriptionData;
        if (!cancelled) {
          setData(json);
          setEditedText(json.text);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleStartRecording = async () => {
    setError(null);
    resetTranscript();
    setStep("recording");
    await start();
  };

  const handleStop = () => {
    stop();
    const newText = liveTextRef.current.trim();
    if (newText && data) {
      setEditedText((prev) => `${prev} ${newText}`.trim());
    }
    setStep("edit");
  };

  const handleSave = async () => {
    const text = editedText.trim();
    if (!text) {
      toast.message("Нет текста");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/transcriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        toast.error(json.error ?? "Не удалось сохранить");
        return;
      }
      toast.success("Сохранено");
      router.push(`/transcriptions/${id}/edit`);
    } catch {
      toast.error("Ошибка сети — попробуйте ещё раз");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="relative z-10 flex min-h-full items-center justify-center pb-28">
        <p className="font-mono text-sm text-indigo-400/80">Загрузка…</p>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-4 py-20 pb-28 text-center">
        <p className="text-slate-400">Расшифровка не найдена.</p>
        <Link href="/files" className="neo-btn-ghost rounded-xl px-4 py-2.5 text-sm font-medium">
          ← К файлам
        </Link>
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/transcriptions/${id}/edit`}
          className="neo-btn-ghost rounded-xl px-3 py-2 text-sm font-medium transition"
          aria-label="Назад"
        >
          ←
        </Link>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-indigo-400/80">
            Продолжение записи
          </p>
          <h1 className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-xl font-semibold tracking-tight text-transparent">
            {data.book.title}
          </h1>
          <p className="font-mono text-xs text-slate-500">
            {buildFilename(data.book.title, data.chapter)}
          </p>
        </div>
      </div>

      <section className={`neo-panel rounded-2xl p-6 flex flex-col gap-5 ${step === "recording" ? "recording-active" : ""}`}>
        {/* Language selector */}
        {step !== "recording" && (
          <label className="flex items-center gap-3 text-sm font-medium text-slate-300">
            <span className="font-mono text-xs uppercase tracking-wider text-indigo-400">Язык</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as SpeechLang)}
              className="cosmic-input"
            >
              <option value="ru-RU">Русский (ru-RU)</option>
              <option value="uk-UA">Українська (uk-UA)</option>
            </select>
          </label>
        )}

        {supported === false && (
          <p className="rounded-xl border border-amber-700/50 bg-amber-950/60 p-3 text-sm text-amber-300">
            Web Speech API недоступен. Используйте Chrome или Edge.
          </p>
        )}

        {/* STEP: review */}
        {step === "review" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs uppercase tracking-wider text-indigo-400">
                Текущий текст
              </label>
              <div className="neo-transcript min-h-[100px] rounded-2xl p-5 font-mono text-sm leading-relaxed text-slate-200">
                <p className="whitespace-pre-wrap">{data.text || <span className="text-slate-500">Пусто</span>}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => void handleStartRecording()}
                disabled={supported === false}
                className="neo-btn-primary relative overflow-hidden rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45"
              >
                Продолжить запись
              </button>
            </div>
          </div>
        )}

        {/* STEP: recording */}
        {step === "recording" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-end gap-[3px] h-8">
                {Array.from({ length: 7 }).map((_, i) => (
                  <span key={i} className="waveform-bar" style={{ animationDuration: `${0.5 + i * 0.07}s` }} />
                ))}
              </div>
              <div>
                <p className="font-semibold text-slate-100">{data.book.title}</p>
                <p className="text-xs text-slate-400">Глава {data.chapter}</p>
              </div>
            </div>

            <div className="neo-transcript min-h-[140px] rounded-2xl p-5 font-mono text-sm leading-relaxed text-slate-200 md:text-base">
              {liveText ? (
                <p className="whitespace-pre-wrap">{liveText}</p>
              ) : (
                <p className="text-slate-500">Слушаю…</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleStop}
                className="neo-btn-ghost relative overflow-hidden rounded-xl px-5 py-2.5 text-sm font-semibold transition"
              >
                Остановить
              </button>
            </div>
          </div>
        )}

        {/* STEP: edit */}
        {step === "edit" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="editText" className="font-mono text-xs uppercase tracking-wider text-indigo-400">
                Редактировать расшифровку
              </label>
              <textarea
                id="editText"
                rows={12}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="cosmic-input w-full rounded-2xl font-mono leading-relaxed resize-y"
                style={{ minHeight: "160px" }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !editedText.trim()}
                className="neo-btn-primary relative overflow-hidden rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45"
              >
                {saving ? "Сохранение…" : "Сохранить"}
              </button>
              <button
                type="button"
                onClick={() => { resetTranscript(); setStep("review"); }}
                className="neo-btn-ghost relative overflow-hidden rounded-xl px-4 py-2.5 text-sm font-semibold transition"
              >
                Записать ещё
              </button>
              <Link
                href={`/transcriptions/${id}/edit`}
                className="neo-btn-ghost rounded-xl px-4 py-2.5 text-sm font-semibold transition"
              >
                Отмена
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
