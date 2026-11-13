import { z } from "zod";
import { conditionSchema } from "./enums";

/** Field form pinjam (tujuan, lokasi, perkiraan waktu kembali, catatan). */
export const borrowDetailsFormSchema = z.object({
  purpose: z.string().trim().min(3, "Tujuan wajib diisi (minimal 3 karakter)").max(300, "Maksimal 300 karakter"),
  usage_location: z.string().trim().min(2, "Lokasi penggunaan wajib diisi").max(150, "Maksimal 150 karakter"),
  expected_return_time: z
    .string()
    .min(1, "Perkiraan waktu kembali wajib diisi")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Tanggal dan waktu tidak valid")
    .refine((v) => Date.parse(v) > Date.now(), "Waktu kembali harus setelah sekarang"),
  notes: z.string().trim().max(1000, "Maksimal 1000 karakter"),
});
export type BorrowDetailsForm = z.infer<typeof borrowDetailsFormSchema>;

/** Satu baris pengembalian (alat atau item pendukung). */
export const returnLineFormSchema = z
  .object({
    kind: z.enum(["eq", "sp"]),
    detail_id: z.string().min(1),
    /** equipment_id (kind "eq") atau supporting_equipment_id (kind "sp"). */
    ref_id: z.string().min(1),
    quantity: z.number().int().min(0),
    max_quantity: z.number().int().min(0),
    final_condition: conditionSchema,
    has_damage: z.boolean(),
    damage_notes: z.string().trim().max(1000, "Maksimal 1000 karakter"),
  })
  .superRefine((l, ctx) => {
    if (l.has_damage && !l.damage_notes) {
      ctx.addIssue({ code: "custom", path: ["damage_notes"], message: "Catatan kerusakan wajib diisi" });
    }
    if (l.final_condition !== "good" && !l.has_damage) {
      ctx.addIssue({ code: "custom", path: ["has_damage"], message: "Centang “Ada kerusakan” jika kondisi tidak baik" });
    }
    if (l.kind === "sp" && l.quantity > l.max_quantity) {
      ctx.addIssue({ code: "custom", path: ["quantity"], message: `Maksimal ${l.max_quantity}` });
    }
  });

export const returnFormSchema = z
  .object({
    lines: z.array(returnLineFormSchema).min(1),
    notes: z.string().trim().max(1000, "Maksimal 1000 karakter"),
  })
  .refine((d) => d.lines.some((l) => l.kind === "eq" || l.quantity > 0), {
    message: "Isi jumlah yang dikembalikan minimal 1",
    path: ["lines"],
  });
export type ReturnLineForm = z.infer<typeof returnLineFormSchema>;
export type ReturnForm = z.infer<typeof returnFormSchema>;
