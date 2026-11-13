/**
 * HANYA untuk server (auth.ts dan app/api/proxy). Jangan diimpor dari komponen klien.
 * Login/refresh ke backend memakai header `X-Client: bff` agar refresh token dikembalikan di body
 * (browser tidak pernah memegang token ini; disimpan terenkripsi di cookie sesi NextAuth).
 */
import type { Role } from "@/types/erd";

export const API_URL = process.env.API_URL ?? "http://localhost:3000/api/v1";

export interface BackendSession {
  accessToken: string;
  refreshToken: string;
  /** Epoch ms kedaluwarsa access token. */
  accessExpires: number;
  user: { id: string; name: string; email: string; role: Role };
}

interface AuthEnvelope {
  data?: {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    user: { user_id: string; name: string; email: string; role: Role };
  };
}

/**
 * IP klien asli dari header `X-Forwarded-For` yang diisi reverse proxy tepercaya (Caddy/Nginx; menimpa nilai dari klien).
 * Diteruskan ke backend agar rate limit (login: 10 gagal/15 menit) dan log aktivitas dihitung per pengguna, bukan per
 * container Next.js. Backend memakai `trust proxy 1` di produksi. Nilai yang bentuknya bukan IP dibuang.
 */
export function clientIp(headers: Headers): string | undefined {
  const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first && /^[0-9a-fA-F:.]{3,45}$/.test(first) ? first : undefined;
}

async function post(path: string, body: unknown, ip?: string): Promise<BackendSession | null> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Client": "bff", ...(ip ? { "X-Forwarded-For": ip } : {}) },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403 || res.status === 422 || res.status === 423 || res.status === 429) return null;
  if (!res.ok) throw new Error(`Backend auth gagal (${res.status})`);
  const d = ((await res.json()) as AuthEnvelope).data;
  if (!d?.refresh_token) throw new Error("Backend tidak mengembalikan refresh_token (butuh versi backend dengan dukungan X-Client: bff)");
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    accessExpires: Date.now() + d.expires_in * 1000,
    user: { id: d.user.user_id, name: d.user.name, email: d.user.email, role: d.user.role },
  };
}

export const loginWithBackend = (email: string, password: string, ip?: string) => post("/auth/login", { email, password }, ip);

/**
 * Refresh token dirotasi backend: token lama hanya ditoleransi ~10 detik; pemakaian ulang SETELAH itu dianggap
 * pencurian dan MENCABUT SEMUA sesi pengguna. Request paralel (React Query menembak banyak query sekaligus) dan
 * cookie lama yang sempat tertimpa (mis. middleware menulis ulang cookie dari request yang berangkat sebelum refresh)
 * harus berbagi SATU hasil refresh: hasilnya di-cache per refresh token lama selama SHARE_MS (sepanjang umur access
 * token, 15 menit). (Per-proses; untuk multi-instance gunakan store bersama, mis. Redis.)
 */
const inflight = new Map<string, { at: number; promise: Promise<BackendSession | null> }>();
const SHARE_MS = 10 * 60_000;

export function refreshWithBackend(refreshToken: string, ip?: string): Promise<BackendSession | null> {
  const now = Date.now();
  for (const [k, v] of inflight) if (now - v.at > SHARE_MS) inflight.delete(k);
  const hit = inflight.get(refreshToken);
  if (hit) return hit.promise;
  const promise = post("/auth/refresh", { refresh_token: refreshToken }, ip);
  inflight.set(refreshToken, { at: now, promise });
  promise.catch(() => inflight.delete(refreshToken));
  return promise;
}
