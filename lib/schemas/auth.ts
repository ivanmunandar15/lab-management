import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi").min(8, "Kata sandi minimal 8 karakter"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Aturan password sama dengan backend (utils/password.ts): 8-72 karakter, ada huruf dan angka. */
export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Password lama wajib diisi"),
    new_password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .max(72, "Password maksimal 72 karakter")
      .regex(/[A-Za-z]/, "Password harus mengandung huruf")
      .regex(/\d/, "Password harus mengandung angka"),
    confirm_password: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((v) => v.new_password !== v.current_password, { path: ["new_password"], message: "Password baru harus berbeda dari password lama" })
  .refine((v) => v.new_password === v.confirm_password, { path: ["confirm_password"], message: "Konfirmasi tidak sama dengan password baru" });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
