import { z } from "zod";
import { post } from "@/lib/api/client";

const reportEquipmentIssueSchema = z.object({
  equipment_id: z.string().min(1),
  description: z.string().trim().min(5, "Jelaskan masalahnya (minimal 5 karakter)").max(1000, "Maksimal 1000 karakter"),
});
export type ReportEquipmentIssueInput = z.infer<typeof reportEquipmentIssueSchema>;

export const reportsService = {
  /** Lapor kerusakan / minta bantuan teknisi: notifikasi ke technician dan SPV (selain pelapor). Status alat tidak berubah. */
  reportEquipmentIssue: (input: ReportEquipmentIssueInput) => post<{ notified: number }>("reports/equipment-issue", input),
};
