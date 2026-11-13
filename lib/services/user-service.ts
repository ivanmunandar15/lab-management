import { del, enc, get, patch, post } from "@/lib/api/client";
import type { CreateUserInput, UpdateUserInput } from "@/lib/schemas";
import type { PublicUser, Role } from "@/types/erd";

export interface UserListParams {
  search?: string;
  role?: Role;
  includeInactive?: boolean;
}

/** Kontrak endpoint: COMPAT_API.md. Validasi, aturan bisnis, dan activity log dijalankan backend. */
export const usersService = {
  list: (params: UserListParams = {}) => get<PublicUser[]>("users", { ...params }),
  getById: (id: string) => get<PublicUser>(`users/${enc(id)}`),
  create: (input: CreateUserInput) => post<PublicUser>("users", input),
  update: (id: string, input: UpdateUserInput) => patch<PublicUser>(`users/${enc(id)}`, input),
  /** Nonaktifkan pengguna (soft delete). */
  softDelete: (id: string) => del<PublicUser>(`users/${enc(id)}`),
  restore: (id: string) => post<PublicUser>(`users/${enc(id)}/restore`),
};
