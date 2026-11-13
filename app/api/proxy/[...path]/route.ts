import { encode, getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { API_URL, clientIp, refreshWithBackend } from "@/lib/auth/backend";

/**
 * Proxy sisi server ke backend (`${API_URL}/compat/...`).
 * - Token backend ada di JWT sesi terenkripsi (cookie httpOnly); proxy menambahkan `Authorization` dan
 *   TIDAK PERNAH mengirim token ke browser.
 * - Access token yang hampir kedaluwarsa di-refresh di sini, lalu cookie sesi ditulis ulang.
 * - Refresh gagal / sesi tidak ada -> 401 (klien melakukan signOut).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SESSION_MAX_AGE = 60 * 60 * 8; // harus sama dengan auth.config.ts
const REFRESH_SKEW_MS = 60_000;
const FORWARD_HEADERS = ["content-type", "content-disposition", "content-length", "cache-control", "x-content-type-options", "content-security-policy"];

const err = (status: number, code: string, message: string) => NextResponse.json({ error: { code, message } }, { status });

async function handler(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (!path?.length || path.some((p) => p === ".." || p === "." || p.includes("\\"))) return err(400, "VALIDATION", "Path tidak valid");

  const secret = process.env.AUTH_SECRET;
  if (!secret) return err(500, "INTERNAL", "AUTH_SECRET belum diatur");
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const secure = proto === "https";
  const cookieName = `${secure ? "__Secure-" : ""}authjs.session-token`;

  const token = await getToken({ req, secret, secureCookie: secure, cookieName, salt: cookieName });
  if (!token?.accessToken || !token.refreshToken) return err(401, "UNAUTHORIZED", "Sesi berakhir. Silakan login kembali.");

  let accessToken = token.accessToken;
  let newCookie: string | null = null;
  if (!token.accessExpires || token.accessExpires - Date.now() < REFRESH_SKEW_MS) {
    let fresh = null;
    try {
      fresh = await refreshWithBackend(token.refreshToken, clientIp(req.headers));
    } catch {
      return err(502, "INTERNAL", "Backend tidak dapat dihubungi");
    }
    if (!fresh) return err(401, "UNAUTHORIZED", "Sesi berakhir. Silakan login kembali.");
    accessToken = fresh.accessToken;
    newCookie = await encode({
      token: { ...token, accessToken: fresh.accessToken, refreshToken: fresh.refreshToken, accessExpires: fresh.accessExpires },
      secret, salt: cookieName, maxAge: SESSION_MAX_AGE,
    });
  }

  const target = `${API_URL}/compat/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  const hasBody = !["GET", "HEAD"].includes(req.method);
  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}`, Accept: "application/json, */*" };
  const ct = req.headers.get("content-type");
  if (ct) headers["Content-Type"] = ct;
  const ip = clientIp(req.headers);
  if (ip) headers["X-Forwarded-For"] = ip; // rate limit & log aktivitas per pengguna (lihat clientIp)

  let upstream: Response;
  try {
    upstream = await fetch(target, { method: req.method, headers, body: hasBody ? await req.arrayBuffer() : undefined, cache: "no-store", redirect: "manual" });
  } catch {
    return err(502, "INTERNAL", "Backend tidak dapat dihubungi");
  }

  const out = new Headers();
  for (const h of FORWARD_HEADERS) {
    const v = upstream.headers.get(h);
    if (v) out.set(h, v);
  }
  const res = new NextResponse(upstream.status === 204 ? null : upstream.body, { status: upstream.status, headers: out });
  if (newCookie) res.cookies.set(cookieName, newCookie, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: SESSION_MAX_AGE });
  return res;
}

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
