"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { Toaster } from "sonner";
import { useEffect } from "react";
import { BottomNav } from "@/components/bottom-nav";

function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      void import("next-pwa/register");
    }
  }, []);
  return null;
}

function NavShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const showNav = status === "authenticated" && !!session;
  return (
    <>
      <div className="flex-1">{children}</div>
      {showNav && <BottomNav />}
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PwaRegister />
      <NavShell>{children}</NavShell>
      <Toaster richColors theme="light" position="top-center" closeButton />
    </SessionProvider>
  );
}
