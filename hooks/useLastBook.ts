"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "dictophone_last_book";

export function useLastBook() {
  const [lastBook, setLastBook] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(KEY);
    if (stored) setLastBook(stored);
  }, []);

  const saveBook = useCallback((title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (typeof window !== "undefined") localStorage.setItem(KEY, trimmed);
    setLastBook(trimmed);
  }, []);

  return { lastBook, saveBook };
}
