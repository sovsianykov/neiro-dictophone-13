"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

const inputClassName =
  "rounded-xl border border-orange-200 bg-white/95 px-3 py-2.5 text-base text-stone-800 shadow-sm outline-none ring-orange-200/60 focus:ring-2";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Пароли не совпадают");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Не удалось зарегистрироваться");
        return;
      }
      toast.success("Аккаунт создан", { description: "Теперь войдите с тем же email и паролем." });
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="neo-panel mx-auto flex w-full max-w-sm flex-col gap-4 rounded-2xl p-8"
    >
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-orange-600/90">Onboard</p>
        <h1 className="mt-1 bg-gradient-to-r from-orange-600 to-rose-500 bg-clip-text text-xl font-semibold tracking-tight text-transparent">
          Регистрация
        </h1>
        <p className="mt-1 text-sm text-stone-600">Пароль — не меньше 8 символов.</p>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700">
        Email
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClassName}
          required
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700">
        Пароль
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClassName}
          required
          minLength={8}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700">
        Повтор пароля
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClassName}
          required
          minLength={8}
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="neo-btn-primary mt-2 rounded-xl py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Регистрация…" : "Создать аккаунт"}
      </button>
      <p className="text-center text-sm text-stone-600">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="font-medium text-orange-600 underline-offset-2 hover:text-rose-600 hover:underline">
          Войти
        </Link>
      </p>
    </form>
  );
}
