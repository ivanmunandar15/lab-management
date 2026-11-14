import { ServiceError, type ServiceErrorCode } from "@/lib/services/errors";

/**
 * Klien HTTP ke backend lewat proxy Next.js (`app/api/proxy/[...path]`).
 * Token tidak pernah ada di browser: proxy menambahkan Authorization dari sesi NextAuth di server.
 * Kontrak respons/error: lihat COMPAT_API.md (error = { error: { code, message, fieldErrors } }).
 */
const BASE = "/api/proxy/";

type Primitive = string | number | boolean | null | undefined;
export type QueryParams = Record<string, Primitive | Primitive[]>;

/** Buang nilai kosong; array digabung koma (backend menerima `status=a,b`). */
export function qs(params: QueryParams = {}): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const v = Array.isArray(value) ? value.filter((x) => x !== undefined && x !== null && x !== "").join(",") : value;
    if (v === undefined || v === null || v === "") continue;
    sp.set(key, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

const CODES: ServiceErrorCode[] = ["NOT_FOUND", "VALIDATION", "CONFLICT", "FORBIDDEN", "UNAUTHORIZED", "INTERNAL"];
/** Kode khusus API utama (mis. EMAIL_NOT_FAILED) dipetakan dari status HTTP-nya. */
const CODE_BY_STATUS: Record<number, ServiceErrorCode> = { 400: "VALIDATION", 401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "NOT_FOUND", 409: "CONFLICT", 422: "VALIDATION" };
let signingOut = false;

async function toError(res: Response): Promise<ServiceError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* body bukan JSON */
  }
  const e = (body as { error?: { code?: string; message?: string; fieldErrors?: Record<string, string> } } | null)?.error;
  const code = CODES.includes(e?.code as ServiceErrorCode) ? (e!.code as ServiceErrorCode) : (CODE_BY_STATUS[res.status] ?? "INTERNAL");
  return new ServiceError(code, e?.message ?? `Permintaan gagal (${res.status})`, e?.fieldErrors);
}

async function request(path: string, init: { method?: string; body?: unknown }): Promise<Response> {
  const res = await fetch(BASE + path, {
    method: init.method ?? "GET",
    headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
    credentials: "same-origin",
  });

  if (res.status === 401 && typeof window !== "undefined" && !signingOut) {
    // Sesi habis / refresh gagal: kembali ke login (sekali saja).
    signingOut = true;
    const { signOut } = await import("next-auth/react");
    void signOut({ callbackUrl: "/login" });
  }
  if (!res.ok) throw await toError(res);
  return res;
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await request(path, init);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Endpoint API utama (bukan compat) lewat proxy `main/...` (hanya yang ada di MAIN_ALLOWLIST proxy).
 * Respons berbentuk amplop `{ success, data, meta? }`; di sini dibuka menjadi `{ data, meta }`.
 */
export async function apiMain<T, M = undefined>(path: string, init: { method?: string; body?: unknown } = {}): Promise<{ data: T; meta: M | undefined }> {
  const res = await request("main/" + path, init);
  const body = (await res.json()) as { data: T; meta?: M };
  return { data: body.data, meta: body.meta };
}

export const get = <T>(path: string, params?: QueryParams) => api<T>(path + qs(params));
export const post = <T>(path: string, body?: unknown) => api<T>(path, { method: "POST", body: body ?? {} });
export const patch = <T>(path: string, body: unknown) => api<T>(path, { method: "PATCH", body });
export const del = <T>(path: string) => api<T>(path, { method: "DELETE" });
export const enc = encodeURIComponent;
