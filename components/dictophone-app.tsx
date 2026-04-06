"use client";

import { useSpeechRecognition, type SpeechLang } from "@/hooks/useSpeechRecognition";
import {
  addTranscriptionLocal,
  deleteTranscriptionLocal,
  listTranscriptionsLocal,
  type LocalTranscription,
} from "@/lib/transcriptions-idb";
import { syncTranscriptions } from "@/lib/sync-transcriptions";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DictophoneApp() {
  const { data: session } = useSession();
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

  const [items, setItems] = useState<LocalTranscription[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(true);

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

  const refreshList = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await listTranscriptionsLocal();
      setItems(list);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const runSync = useCallback(async (quiet?: boolean) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (!quiet) toast.message("Нет сети", { description: "Синхронизация отложена до появления соединения." });
      return;
    }
    setSyncing(true);
    try {
      const { synced, failed } = await syncTranscriptions();
      await refreshList();
      if (!quiet && (synced > 0 || failed > 0)) {
        if (synced > 0) toast.success(`Синхронизировано записей: ${synced}`);
        if (failed > 0) toast.error(`Не удалось отправить: ${failed}`);
      }
    } catch {
      if (!quiet) toast.error("Ошибка синхронизации");
    } finally {
      setSyncing(false);
    }
  }, [refreshList]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  useEffect(() => {
    const onOnline = () => {
      void runSync(true);
      toast.success("Соединение восстановлено", { description: "Запускаем синхронизацию…" });
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [runSync]);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void runSync(true);
    }
  }, [runSync]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleClearLiveText = () => {
    if (listening) stop();
    setError(null);
    resetTranscript();
    toast.message("Текст очищен", { description: "Поле расшифровки сброшено." });
  };

  const handleSave = async () => {
    const text = liveText.trim();
    if (!text) {
      toast.message("Нет текста", { description: "Сначала продиктуйте или введите фразу." });
      return;
    }
    setSaving(true);
    try {
      const createdAt = Date.now();
      await addTranscriptionLocal({ text, createdAt, synced: false });
      resetTranscript();
      await refreshList();
      toast.success("Сохранено локально");
      if (typeof navigator !== "undefined" && navigator.onLine) await runSync(true);
    } catch {
      toast.error("Не удалось сохранить в IndexedDB");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadLive = () => {
    const text = liveText.trim();
    if (!text) {
      toast.message("Нечего сохранять", { description: "Текст пустой." });
      return;
    }
    downloadTextFile(`dictophone-${Date.now()}.txt`, text);
    toast.success("Файл загружается");
  };

  const handleDeleteSaved = async (row: LocalTranscription) => {
    if (row.id == null) return;
    if (!window.confirm("Удалить эту запись с устройства? Текст и локальный .txt-экспорт исчезнут из списка.")) return;
    try {
      await deleteTranscriptionLocal(row.id);
      await refreshList();
      toast.success("Запись удалена");
    } catch {
      toast.error("Не удалось удалить запись");
    }
  };

  const pendingCount = items.filter((i) => !i.synced).length;

  const badgeOnline = online
    ? "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm"
    : "border-amber-300 bg-amber-50 text-amber-900 shadow-sm";

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-10">
      <header className="neo-panel flex flex-col gap-5 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-orange-600/90">Dictophone // v1</p>
          <h1 className="bg-gradient-to-r from-orange-500 via-rose-500 to-amber-400 bg-clip-text text-2xl font-semibold tracking-tight text-transparent">
            Нейро-диктофон
          </h1>
          <p className="text-sm text-stone-600">
            Офлайн · синхронизация ·{" "}
            <span className="font-mono text-orange-700">{session?.user?.email}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runSync()}
            disabled={syncing || !online}
            className="neo-btn-ghost rounded-xl px-4 py-2.5 text-sm font-medium transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {syncing ? "Синхронизация…" : "Синхронизировать"}
          </button>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-xl border border-orange-200 bg-white/90 px-4 py-2.5 text-sm font-medium text-stone-800 shadow-sm transition hover:border-orange-300 hover:bg-white"
          >
            Выйти
          </button>
        </div>
      </header>

      <section className="neo-panel rounded-2xl p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-3 text-sm font-medium text-stone-700">
            <span className="font-mono text-xs uppercase tracking-wider text-orange-600">Язык</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as SpeechLang)}
              disabled={listening}
              className="rounded-xl border border-orange-200 bg-white/95 px-3 py-2 text-sm text-stone-800 shadow-sm outline-none ring-orange-300/40 focus:ring-2 disabled:opacity-50"
            >
              <option value="ru-RU">Русский (ru-RU)</option>
              <option value="uk-UA">Українська (uk-UA)</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-medium ${badgeOnline}`}>
              <span
                className={`mr-2 h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-500 shadow-[0_0_6px_#34d399]" : "bg-amber-500"}`}
              />
              {online ? "Онлайн" : "Офлайн"}
            </span>
            {pendingCount > 0 && (
              <span className="inline-flex items-center rounded-lg border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-900 shadow-sm">
                В очереди: {pendingCount}
              </span>
            )}
          </div>
        </div>

        {supported === false && (
          <p className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            Web Speech API недоступен. Используйте Chrome или Edge.
          </p>
        )}

        <div className="neo-transcript mb-5 min-h-[140px] rounded-2xl p-5 font-mono text-sm leading-relaxed text-stone-800 md:text-base">
          {liveText ? (
            <p>{liveText}</p>
          ) : (
            <p className="text-stone-400">Живая расшифровка появится здесь…</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              void start();
            }}
            disabled={listening || supported === false}
            className="neo-btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45"
          >
            {listening ? "● Запись…" : "Начать запись"}
          </button>
          <button
            type="button"
            onClick={stop}
            disabled={!listening}
            className="neo-btn-ghost rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Остановить
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !liveText.trim()}
            className="rounded-xl border border-rose-300 bg-gradient-to-r from-rose-100 to-orange-100 px-4 py-2.5 text-sm font-semibold text-rose-900 shadow-sm transition hover:from-rose-50 hover:to-orange-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
          <button
            type="button"
            onClick={handleDownloadLive}
            disabled={!liveText.trim()}
            className="neo-btn-ghost rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Скачать .txt
          </button>
          <button
            type="button"
            onClick={handleClearLiveText}
            disabled={!liveText.trim() && !listening}
            className="rounded-xl border border-stone-300 bg-white/80 px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-orange-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            Очистить текст
          </button>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text font-mono text-sm font-semibold uppercase tracking-[0.2em] text-transparent">
            Архив расшифровок
          </h2>
          {loadingList && <span className="font-mono text-xs text-orange-600/80">Загрузка…</span>}
        </div>
        <ul className="flex flex-col gap-4">
          {items.length === 0 && !loadingList && (
            <li className="neo-panel rounded-2xl p-8 text-center text-sm text-stone-500">
              Нет записей. Сохраните первую расшифровку.
            </li>
          )}
          {items.map((row) => (
            <li
              key={row.id ?? `${row.createdAt}-${row.text.slice(0, 8)}`}
              className="neo-panel rounded-2xl p-5 transition duration-300 hover:border-orange-300"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <time className="font-mono text-xs text-stone-500" dateTime={new Date(row.createdAt).toISOString()}>
                  {new Date(row.createdAt).toLocaleString()}
                </time>
                <span
                  className={`rounded-lg border px-2.5 py-0.5 text-xs font-medium ${
                    row.synced
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : "border-amber-300 bg-amber-50 text-amber-950"
                  }`}
                >
                  {row.synced ? "На сервере" : "Только локально"}
                </span>
              </div>
              <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-stone-800">{row.text}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    downloadTextFile(`dictophone-${row.createdAt}.txt`, row.text);
                    toast.success("Файл загружается");
                  }}
                  className="neo-btn-ghost rounded-lg px-3 py-2 text-xs font-semibold"
                >
                  Скачать .txt
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteSaved(row)}
                  className="neo-btn-danger rounded-lg px-3 py-2 text-xs font-semibold transition hover:bg-rose-100"
                >
                  Удалить запись
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
