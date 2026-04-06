import { LoginForm } from "@/components/login-form";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="relative z-10 flex min-h-full flex-1 items-center justify-center px-4 py-16">
      <Suspense
        fallback={
          <p className="font-mono text-sm text-cyan-400/60" aria-live="polite">
            Загрузка формы…
          </p>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
