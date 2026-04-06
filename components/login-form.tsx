"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const inputClassName =
  "rounded-xl border border-orange-200 bg-white/95 px-3 py-2.5 text-base text-stone-800 shadow-sm outline-none ring-orange-200/60 focus:ring-2";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (res?.error) {
        toast.error("Неверный email или пароль");
        return;
      }
      router.push(callbackUrl);
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
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-orange-600/90">Access</p>
        <h1 className="mt-1 bg-gradient-to-r from-orange-600 to-rose-500 bg-clip-text text-xl font-semibold tracking-tight text-transparent">
          Вход
        </h1>
        <p className="mt-1 text-sm text-stone-600">Email и пароль с регистрации.</p>
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClassName}
          required
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="neo-btn-primary mt-2 rounded-xl py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Вход…" : "Войти"}
      </button>
      <p className="text-center text-sm text-stone-600">
        Нет аккаунта?{" "}
        <Link href="/register" className="font-medium text-orange-600 underline-offset-2 hover:text-rose-600 hover:underline">
          Зарегистрироваться
        </Link>
      </p>
    </form>
  );
}
