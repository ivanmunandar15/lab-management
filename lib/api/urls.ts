/**
 * Backend mengembalikan `file_url` / `certificate_file_url` berupa path API ber-auth
 * (`/api/v1/compat/...`). Browser membukanya lewat proxy Next.js (`/api/proxy/...`) yang memakai cookie sesi.
 */
const BACKEND_PREFIX = "/api/v1/compat/";

export const isBackendFileUrl = (url: string): boolean => url.startsWith(BACKEND_PREFIX);

export function toProxyUrl(url: string, opts: { inline?: boolean } = {}): string {
  const proxied = `/api/proxy/${url.slice(BACKEND_PREFIX.length)}`;
  if (!opts.inline) return proxied;
  return proxied + (proxied.includes("?") ? "&" : "?") + "inline=true";
}
