"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { useEffect } from "react";

function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      void import("next-pwa/register");
    }
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PwaRegister />
      {children}
      <Toaster richColors theme="light" position="top-center" closeButton />
    </SessionProvider>
  );
}
