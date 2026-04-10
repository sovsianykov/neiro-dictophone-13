"use client";

import { useSpeechRecognition, type SpeechLang } from "@/hooks/useSpeechRecognition";
import { useLastBook } from "@/hooks/useLastBook";
import { useSound } from "@/hooks/useSound";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { buildFilename } from "@/lib/filename";

// ─── Types ───────────────────────────────────────────────────────────────────

type Step =
  | "setup"     // fill book + chapter before recording
  | "recording" // mic is active
  | "review";   // recording stopped — inline editing before save

// ─── Ripple helper ────────────────────────────────────────────────────────────

function addRipple(e: React.MouseEvent<HTMLButtonElement>) {
  const btn = e.currentTarget;
  const circle = document.createElement("span");
  const rect = btn.getBoundingClientRect();
  circle.className = "ripple";
  circle.style.left = `${e.clientX - rect.left}px`;
  circle.style.top = `${e.clientY - rect.top}px`;
  btn.appendChild(circle);
  circle.addEventListener("animationend", () => circle.remove());
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DictophoneApp() {
  const { data: session } = useSession();
  const router = useRouter();

  const [lang, setLang] = useState<SpeechLang>("ru-RU");
  const {
    supported,
    listening,
    liveText,
    error,
    start,
    stop,
    resetTranscript,
    setError,
  } = useSpeechRecognition(lang);

  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Pre-recording setup
  const [step, setStep] = useState<Step>("setup");
  const { lastBook, saveBook } = useLastBook();
  const [bookTitle, setBookTitle] = useState("");
  const [chapterInput, setChapterInput] = useState("");

  useEffect(() => {
    if (lastBook && !bookTitle) setBookTitle(lastBook);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastBook]);
  const [setupError, setSetupError] = useState("");

  // Review / inline editing
  const [editedText, setEditedText] = useState("");
  const [saving, setSaving] = useState(false);

  // track liveText when recording stops
  const liveTextRef = useRef(liveText);
  useEffect(() => { liveTextRef.current = liveText; }, [liveText]);

  // text accumulated before resuming (to prepend to new liveText)
  const resumeBaseRef = useRef("");

  // ── Sound ──────────────────────────────────────────────────────────────────
  const { enabled: soundEnabled, toggle: toggleSound, click: playClick, keyStroke, startAmbientSound, stopAmbientSound } = useSound();

  // Start ambient on first user interaction
  const ambientStarted = useRef(false);
  const handleFirstInteraction = useCallback(() => {
    if (!ambientStarted.current) {
      ambientStarted.current = true;
      startAmbientSound();
    }
  }, [startAmbientSound]);

  // Mute ambient while recording
  useEffect(() => {
    if (step === "recording") {
      stopAmbientSound();
    } else if (ambientStarted.current && soundEnabled) {
      startAmbientSound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Online tracking ────────────────────────────────────────────────────────

  useEffect(() => {
    setOnline(typeof navigator !== "undefined" && navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // ── Background sync ────────────────────────────────────────────────────────

  const runSync = useCallback(async (quiet?: boolean) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (!quiet) toast.message("Нет сети", { description: "Синхронизация отложена." });
      return;
    }
    setSyncing(true);
    try {
      const { syncTranscriptions } = await import("@/lib/sync-transcriptions");
      const result = await syncTranscriptions();
      if (!quiet && (result.synced > 0 || result.failed > 0)) {
        if (result.synced > 0) toast.success(`Синхронизировано: ${result.synced}`);
        if (result.failed > 0) toast.error(`Не удалось: ${result.failed}`);
      }
    } catch {
      if (!quiet) toast.error("Ошибка синхронизации");
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.onLine) void runSync(true);
  }, [runSync]);

  useEffect(() => {
    const onOnline = () => {
      void runSync(true);
      toast.success("Соединение восстановлено", { description: "Запускаем синхронизацию…" });
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [runSync]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // ── Setup validation ───────────────────────────────────────────────────────

  const handleStartRecording = async (e: React.MouseEvent<HTMLButtonElement>) => {
    handleFirstInteraction();
    playClick();
    addRipple(e);
    const title = bookTitle.trim();
    if (!title) {
      setSetupError("Введите название книги");
      return;
    }
    const chapterNum = chapterInput.trim() ? Number(chapterInput.trim()) : null;
    if (chapterInput.trim() && (!Number.isInteger(chapterNum) || (chapterNum as number) < 1)) {
      setSetupError("Номер главы должен быть целым числом ≥ 1");
      return;
    }
    setSetupError("");
    setError(null);
    resetTranscript();
    saveBook(title);
    setStep("recording");
    await start();
  };

  // ── Stop recording → go to review ─────────────────────────────────────────

  const handleStop = (e: React.MouseEvent<HTMLButtonElement>) => {
    playClick();
    addRipple(e);
    stop();
    const base = resumeBaseRef.current;
    const newText = liveTextRef.current.trim();
    setEditedText(base ? `${base} ${newText}`.trim() : newText);
    resumeBaseRef.current = "";
    setStep("review");
  };

  // ── Resume recording (append to editedText) ────────────────────────────────

  const handleResume = async (e: React.MouseEvent<HTMLButtonElement>) => {
    playClick();
    addRipple(e);
    resumeBaseRef.current = editedText.trim();
    resetTranscript();
    setStep("recording");
    await start();
  };

  // ── Save after inline editing ──────────────────────────────────────────────

  const handleSave = async (e: React.MouseEvent<HTMLButtonElement>) => {
    playClick();
    addRipple(e);
    const text = editedText.trim();
    if (!text) {
      toast.message("Нет текста", { description: "Введите или продиктуйте текст." });
      return;
    }

    const title = bookTitle.trim();
    const chapterNum = chapterInput.trim() ? Number(chapterInput.trim()) : undefined;

    setSaving(true);
    try {
      const res = await fetch("/api/transcriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          createdAt: Date.now(),
          bookTitle: title,
          ...(chapterNum !== undefined ? { chapter: chapterNum } : {}),
        }),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        if (res.status === 409) {
          toast.error(json.error ?? "Глава уже существует в этой книге");
        } else {
          toast.error(json.error ?? "Не удалось сохранить");
        }
        return;
      }

      const json = (await res.json()) as { id: string; bookTitle: string; chapter: number };
      const filename = buildFilename(json.bookTitle, json.chapter);
      toast.success(`Сохранено: ${filename}`);
      resetTranscript();
      router.push(`/transcriptions/${json.id}/edit`);
    } catch {
      toast.error("Ошибка сети — попробуйте ещё раз");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    playClick();
    addRipple(e);
    setEditedText("");
    resetTranscript();
    setStep("setup");
  };

  // ── Download .txt ──────────────────────────────────────────────────────────

  const handleDownload = (e: React.MouseEvent<HTMLButtonElement>) => {
    playClick();
    addRipple(e);
    const text = (step === "review" ? editedText : liveText).trim();
    if (!text) {
      toast.message("Нечего сохранять", { description: "Текст пустой." });
      return;
    }
    const title = bookTitle.trim() || "Untitled";
    const chapterNum = chapterInput.trim() ? Number(chapterInput.trim()) : 1;
    const filename = buildFilename(title, chapterNum);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Файл загружается: ${filename}`);
  };

  // ── Badges ─────────────────────────────────────────────────────────────────

  const badgeOnline = online
    ? "border-emerald-700/60 bg-emerald-950/60 text-emerald-400"
    : "border-amber-700/60 bg-amber-950/60 text-amber-400";

  const chapterNum = chapterInput.trim() ? Number(chapterInput.trim()) : null;
  const previewFilename =
    bookTitle.trim()
      ? buildFilename(bookTitle.trim(), chapterNum ?? 1)
      : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-10 pb-28">
      {/* Header */}
      <header className="neo-panel flex flex-col gap-5 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-indigo-400/80">Dictophone // v1</p>
          <h1 className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-2xl font-semibold tracking-tight text-transparent">
            Нейро-диктофон
          </h1>
          <p className="text-sm text-slate-400">
            Офлайн · синхронизация ·{" "}
            <span className="font-mono text-indigo-300">{session?.user?.email}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-medium ${badgeOnline}`}>
            <span
              className={`mr-2 h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : "bg-amber-400"}`}
            />
            {online ? "Онлайн" : "Офлайн"}
          </span>
          <button
            type="button"
            onClick={(e) => { handleFirstInteraction(); playClick(); addRipple(e); void runSync(); }}
            disabled={syncing || !online}
            className="neo-btn-ghost relative overflow-hidden rounded-xl px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            {syncing ? "Синхронизация…" : "Синхронизировать"}
          </button>
          <button
            type="button"
            onClick={() => { handleFirstInteraction(); toggleSound(); }}
            className={`sound-btn ${soundEnabled ? "sound-on" : ""}`}
            title={soundEnabled ? "Выключить звук" : "Включить звук"}
          >
            {soundEnabled ? "🔊" : "🔇"} {soundEnabled ? "ON" : "OFF"}
          </button>
          <button
            type="button"
            onClick={() => { playClick(); void signOut({ callbackUrl: "/login" }); }}
            className="neo-btn-ghost relative overflow-hidden rounded-xl px-4 py-2.5 text-sm font-medium"
          >
            Выйти
          </button>
        </div>
      </header>

      {/* Main section */}
      <section className={`neo-panel rounded-2xl p-6 flex flex-col gap-5 ${step === "recording" ? "recording-active" : ""}`}>

        {/* Language selector (always visible except during recording) */}
        {step !== "recording" && (
          <label className="flex items-center gap-3 text-sm font-medium text-slate-300">
            <span className="font-mono text-xs uppercase tracking-wider text-indigo-400">Язык</span>
            <select
              value={lang}
              onChange={(e) => { playClick(); setLang(e.target.value as SpeechLang); }}
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

        {/* ── STEP: SETUP ── */}
        {step === "setup" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="bookTitle" className="font-mono text-xs uppercase tracking-wider text-indigo-400">
                Книга
              </label>
              <input
                id="bookTitle"
                type="text"
                placeholder="Название книги"
                value={bookTitle}
                onChange={(e) => {
                  setBookTitle(e.target.value);
                  if (e.target.value.trim()) saveBook(e.target.value.trim());
                }}
                onKeyDown={keyStroke}
                className="cosmic-input w-full"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="chapter" className="font-mono text-xs uppercase tracking-wider text-indigo-400">
                Глава <span className="normal-case text-slate-500">(оставьте пустым для авто)</span>
              </label>
              <input
                id="chapter"
                type="number"
                min={1}
                placeholder="Авто"
                value={chapterInput}
                onChange={(e) => setChapterInput(e.target.value)}
                onKeyDown={keyStroke}
                className="cosmic-input w-32"
              />
            </div>

            {previewFilename && (
              <p className="font-mono text-xs text-slate-500">
                Файл: <span className="text-indigo-400">{previewFilename}</span>
              </p>
            )}

            {setupError && (
              <p className="text-xs text-rose-400">{setupError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={(e) => void handleStartRecording(e)}
                disabled={supported === false}
                className="neo-btn-primary relative overflow-hidden rounded-xl px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
              >
                Начать запись
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: RECORDING ── */}
        {step === "recording" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              {/* Waveform */}
              <div className="flex items-end gap-[3px] h-8">
                {Array.from({ length: 7 }).map((_, i) => (
                  <span key={i} className="waveform-bar" style={{ animationDuration: `${0.5 + i * 0.07}s` }} />
                ))}
              </div>
              <div>
                <p className="font-semibold text-slate-100">{bookTitle}</p>
                <p className="text-xs text-slate-400">
                  Глава {chapterInput.trim() ? chapterInput : "(авто)"}
                </p>
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
                className="neo-btn-ghost relative overflow-hidden rounded-xl px-5 py-2.5 text-sm font-semibold"
              >
                Остановить
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: REVIEW (inline editing) ── */}
        {step === "review" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-100">{bookTitle}</p>
                <p className="text-xs text-slate-400">
                  Глава {chapterInput.trim() ? chapterInput : "(авто)"} ·{" "}
                  <span className="font-mono text-indigo-400">
                    {buildFilename(bookTitle.trim() || "Untitled", chapterNum ?? 1)}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="editText" className="font-mono text-xs uppercase tracking-wider text-indigo-400">
                Редактировать расшифровку
              </label>
              <textarea
                id="editText"
                rows={10}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                onKeyDown={keyStroke}
                className="cosmic-input w-full rounded-2xl font-mono leading-relaxed resize-y"
                style={{ minHeight: "160px" }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={(e) => void handleSave(e)}
                disabled={saving || !editedText.trim()}
                className="neo-btn-primary relative overflow-hidden rounded-xl px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
              >
                {saving ? "Сохранение…" : "Сохранить"}
              </button>
              <button
                type="button"
                onClick={(e) => void handleResume(e)}
                disabled={supported === false}
                className="neo-btn-ghost relative overflow-hidden rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Продолжить запись
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!editedText.trim()}
                className="neo-btn-ghost relative overflow-hidden rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                Скачать .txt
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="neo-btn-ghost relative overflow-hidden rounded-xl px-4 py-2.5 text-sm font-semibold"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
