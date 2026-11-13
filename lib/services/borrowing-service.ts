import { enc, get, patch, post } from "@/lib/api/client";
import type { BorrowingDisplayStatus } from "@/lib/domain";
import type { CreateBorrowingInput, ReturnBorrowingInput, UpdateBorrowingInput } from "@/lib/schemas";
import type { BorrowingWithDetails } from "@/types/erd";

export interface BorrowingListParams {
  search?: string;
  /** "overdue" dihitung, bukan disimpan. */
  status?: BorrowingDisplayStatus;
  user_id?: string;
  equipment_id?: string;
  supporting_equipment_id?: string;
}

/**
 * Catatan kontrak: `user_id` harus pengguna yang login (backend menolak 403 bila berbeda) dan
 * `borrowing_time` diabaikan (waktu server). Stok, status alat, dan notifikasi ditangani transaksi di backend.
 */
export const borrowingsService = {
  list: (params: BorrowingListParams = {}) => get<BorrowingWithDetails[]>("borrowings", { ...params }),
  getById: (id: string) => get<BorrowingWithDetails>(`borrowings/${enc(id)}`),
  create: (input: CreateBorrowingInput) => post<BorrowingWithDetails>("borrowings", input),
  update: (id: string, input: UpdateBorrowingInput) => patch<BorrowingWithDetails>(`borrowings/${enc(id)}`, input),
  returnBorrowing: (id: string, input: ReturnBorrowingInput) => post<BorrowingWithDetails>(`borrowings/${enc(id)}/return`, input),
};
