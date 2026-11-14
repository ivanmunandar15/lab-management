import { apiMain, enc } from "@/lib/api/client";

/** Password: endpoint API utama (bukan compat), lewat proxy `main/...` dengan allowlist. */
export const accountService = {
  /**
   * Ganti password milik sendiri. Backend mencabut SEMUA refresh token pengguna (tanpa cookie refresh, sesi BFF ini ikut),
   * jadi pemanggil harus keluar (signOut) setelah berhasil.
   */
  changePassword: async (input: { current_password: string; new_password: string }) =>
    (await apiMain<{ message: string }>("auth/me/password", { method: "PATCH", body: input })).data,

  /** Admin mereset password pengguna lain. Tanpa `newPassword`, backend membuat password sementara dan mengembalikannya SEKALI. */
  resetUserPassword: async (userId: string, newPassword?: string) =>
    (await apiMain<{ message: string; temporary_password?: string }>(`users/${enc(userId)}/reset-password`, { method: "POST", body: newPassword ? { new_password: newPassword } : {} })).data,
};
