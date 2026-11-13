import { del, enc, get, patch, post } from "@/lib/api/client";
import type { CreateRoomInput, UpdateRoomInput } from "@/lib/schemas";
import type { Room } from "@/types/erd";

export interface RoomListParams {
  search?: string;
}

export const roomsService = {
  list: (params: RoomListParams = {}) => get<Room[]>("rooms", { ...params }),
  getById: (id: string) => get<Room>(`rooms/${enc(id)}`),
  create: (input: CreateRoomInput) => post<Room>("rooms", input),
  update: (id: string, input: UpdateRoomInput) => patch<Room>(`rooms/${enc(id)}`, input),
  /** Backend: soft delete; ditolak (CONFLICT) bila ruangan masih punya alat/sensor aktif. */
  remove: (id: string) => del<void>(`rooms/${enc(id)}`),
};
