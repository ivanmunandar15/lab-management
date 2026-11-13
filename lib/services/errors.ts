export type ServiceErrorCode = "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "FORBIDDEN" | "UNAUTHORIZED" | "INTERNAL";

/** Error dari backend (lihat lib/api/client.ts). Kode sama dengan `error.code` pada kontrak COMPAT_API.md. */
export class ServiceError extends Error {
  constructor(
    public readonly code: ServiceErrorCode,
    message: string,
    /** Untuk VALIDATION: peta "path.field" -> pesan (cocok dengan setError React Hook Form). */
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}
