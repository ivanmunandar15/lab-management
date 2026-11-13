"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateRoomInput, UpdateRoomInput } from "@/lib/schemas";
import { roomsService, type RoomListParams } from "@/lib/services";
import { queryKeys } from "./query-keys";

export const useRooms = (params?: RoomListParams) =>
  useQuery({ queryKey: queryKeys.rooms.list(params), queryFn: () => roomsService.list(params), placeholderData: keepPreviousData });

export const useRoom = (id?: string) =>
  useQuery({ queryKey: queryKeys.rooms.detail(id ?? ""), queryFn: () => roomsService.getById(id!), enabled: !!id });

function useRoomMutation<TVars, TData>(fn: (v: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.rooms.all });
      qc.invalidateQueries({ queryKey: queryKeys.activityLogs.all });
    },
  });
}

export const useCreateRoom = () => useRoomMutation((data: CreateRoomInput) => roomsService.create(data));
export const useUpdateRoom = () => useRoomMutation(({ id, data }: { id: string; data: UpdateRoomInput }) => roomsService.update(id, data));
export const useDeleteRoom = () => useRoomMutation((id: string) => roomsService.remove(id));
