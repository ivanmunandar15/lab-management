/** Hanya izinkan path internal agar callbackUrl tidak bisa dipakai untuk open-redirect. */
export function getSafeCallbackUrl(raw: string | null | undefined, fallback = "/dashboard") {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (raw === "/login" || raw.startsWith("/login?") || raw.startsWith("/api/auth")) return fallback;
  return raw;
}
