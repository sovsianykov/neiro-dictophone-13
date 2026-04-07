"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatTranscript } from "@/lib/format-transcript";

export type SpeechLang = "ru-RU" | "uk-UA";

function getRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition(lang: SpeechLang) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [debouncedInterim, setDebouncedInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldListenRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const langRef = useRef(lang);
  // Track last appended final chunk to prevent duplicates on mobile
  const lastFinalRef = useRef("");

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedInterim(interimTranscript), 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [interimTranscript]);

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
  }, []);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setListening(false);
  }, []);

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
      // Request audio-only, no video — prevents any playback attachment
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      } as MediaStreamConstraints);
      // Immediately stop the test stream; recognition API manages its own
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setError("Доступ к микрофону запрещён или устройство недоступно.");
      return;
    }

    setError(null);
    shouldListenRef.current = true;

    const bindInstance = (r: SpeechRecognition) => {
      r.lang = langRef.current;
      r.continuous = true;
      r.interimResults = true;

      r.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i]?.[0]?.transcript ?? "";
          if (event.results[i].isFinal) final += piece;
          else interim += piece;
        }
        if (final) {
          const trimmed = final.trim();
          // Deduplicate: skip if this chunk is the same as the last appended one
          if (trimmed && trimmed !== lastFinalRef.current) {
            lastFinalRef.current = trimmed;
            setFinalTranscript((prev) => `${prev} ${trimmed}`.trim());
          }
        }
        setInterimTranscript(interim);
      };

      r.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setError("Доступ к микрофону запрещён. Разрешите использование микрофона в настройках браузера.");
          shouldListenRef.current = false;
          setListening(false);
          return;
        }
        if (event.error === "no-speech" || event.error === "aborted") {
          return;
        }
        setError(`Ошибка распознавания: ${event.error}`);
      };

      r.onend = () => {
        if (!shouldListenRef.current) {
          setListening(false);
          recognitionRef.current = null;
          return;
        }
        try {
          const next = new Ctor();
          recognitionRef.current = next;
          bindInstance(next);
          next.start();
          setListening(true);
        } catch {
          shouldListenRef.current = false;
          setListening(false);
          recognitionRef.current = null;
        }
      };
    };

    try {
      const r = new Ctor();
      recognitionRef.current = r;
      bindInstance(r);
      r.start();
      setListening(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось запустить распознавание.");
      shouldListenRef.current = false;
      setListening(false);
      recognitionRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const resetTranscript = useCallback(() => {
    setFinalTranscript("");
    setInterimTranscript("");
    setDebouncedInterim("");
    lastFinalRef.current = "";
  }, []);

  const liveText = formatTranscript(`${finalTranscript} ${debouncedInterim}`.trim());

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
