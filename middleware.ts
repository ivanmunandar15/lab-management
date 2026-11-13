import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "./auth.config";
import { canAccessPath } from "@/lib/rbac";
import { getSafeCallbackUrl } from "@/lib/safe-redirect";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const user = req.auth?.user;
  const isLoginPage = nextUrl.pathname === "/login";

  if (isLoginPage) {
    if (!user) return NextResponse.next();
    const target = getSafeCallbackUrl(nextUrl.searchParams.get("callbackUrl"));
    return NextResponse.redirect(new URL(target, nextUrl));
  }

  // Belum login: simpan URL tujuan (mis. /scan/abc123) agar kembali setelah login.
  if (!user) {
    const callbackUrl = nextUrl.pathname + nextUrl.search;
    const url = new URL("/login", nextUrl);
    url.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(url);
  }

  if (!canAccessPath(user.role, nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/forbidden", nextUrl));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|api/proxy|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|ico|webmanifest)$).*)"],
};
