import { authConfig } from "@/auth.config";
import NextAuth from "next-auth";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLogin = pathname.startsWith("/login");
  const isRegister = pathname.startsWith("/register");
  const isAuthApi = pathname.startsWith("/api/auth");
  const isApi = pathname.startsWith("/api/");
  /** Иконки и OG — без сессии (краулеры, PWA manifest, соцсети). */
  const isPublicMeta =
    pathname === "/icon" ||
    pathname === "/apple-icon" ||
    pathname === "/opengraph-image" ||
    pathname.startsWith("/pwa/");
  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/favicon.svg" ||
    pathname === "/manifest.json" ||
    pathname === "/icon-192.png" ||
    pathname === "/icon-512.png";

  if (isAuthApi || isPublicMeta || isPublicAsset) return NextResponse.next();

  if (!req.auth && isApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!req.auth && !isLogin && !isRegister) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (req.auth && (isLogin || isRegister)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /* страницы, защищённые API; без внутренностей Next, без /api/auth, без путей с расширением файла */
    "/((?!_next/|_next$|api/auth|api/register|pwa/|.*\\..*).*)",
  ],
};
