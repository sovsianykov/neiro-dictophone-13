"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatTranscript } from "@/lib/format-transcript";

export type SpeechLang = "ru-RU" | "uk-UA";

function getRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition(lang: SpeechLang) {
  const [listening, setListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [debouncedInterim, setDebouncedInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const langRef = useRef(lang);

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  // debounce interim (чтобы не дергать UI)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedInterim(interimTranscript);
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [interimTranscript]);

  const supported = !!getRecognitionCtor();

  // ─────────────────────────────────────────────────────────────
  // STOP
  // ─────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    try {
      recognitionRef.current?.abort(); // ✅ важно для mobile
    } catch {
      /* ignore */
    }

    recognitionRef.current = null;
    setListening(false);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // START
  // ─────────────────────────────────────────────────────────────
  const start = useCallback(async () => {
    const Ctor = getRecognitionCtor();

    if (!Ctor) {
      setError("Распознавание речи не поддерживается в этом браузере.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("API микрофона недоступен в этом контексте.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });

      // сразу закрываем тестовый поток
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setError("Доступ к микрофону запрещён или устройство недоступно.");
      return;
    }

    setError(null);

    try {
      const recognition = new Ctor();
      recognitionRef.current = recognition;

      recognition.lang = langRef.current;
      recognition.continuous = false; // ✅ КРИТИЧНО для PWA
      recognition.interimResults = true;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result?.[0]?.transcript ?? "";

          if (result.isFinal) {
            final += text;
          } else {
            interim += text;
          }
        }

        // ✅ защита от дублей
        if (final) {
          const trimmed = final.trim();

          setFinalTranscript((prev) => {
            if (!trimmed) return prev;
            if (prev.includes(trimmed)) return prev;
            return `${prev} ${trimmed}`.trim();
          });
        }

        setInterimTranscript(interim);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (
            event.error === "no-speech" ||
            event.error === "aborted"
        ) {
          return;
        }

        if (
            event.error === "not-allowed" ||
            event.error === "service-not-allowed"
        ) {
          setError(
              "Доступ к микрофону запрещён. Разрешите использование микрофона."
          );
        } else {
          setError(`Ошибка распознавания: ${event.error}`);
        }

        setListening(false);
      };

      recognition.onend = () => {
        // ❌ никаких restart
        setListening(false);
        recognitionRef.current = null;
      };

      recognition.start();
      setListening(true);
    } catch (e) {
      setError(
          e instanceof Error
              ? e.message
              : "Не удалось запустить распознавание."
      );
      setListening(false);
      recognitionRef.current = null;
    }
  }, []);

  // cleanup
  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const resetTranscript = useCallback(() => {
    setFinalTranscript("");
    setInterimTranscript("");
    setDebouncedInterim("");
  }, []);

  const liveText = formatTranscript(
      `${finalTranscript} ${debouncedInterim}`.trim()
  );

  return {
    supported,
    listening,
    finalTranscript,
    interimTranscript,
    debouncedInterim,
    liveText,
    error,
    start,
    stop,
    resetTranscript,
    setError,
  };
}