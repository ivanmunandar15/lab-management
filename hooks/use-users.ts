"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateUserInput, UpdateUserInput } from "@/lib/schemas";
import { usersService, type UserListParams } from "@/lib/services";
import { queryKeys } from "./query-keys";

export const useUsers = (params?: UserListParams) =>
  useQuery({ queryKey: queryKeys.users.list(params), queryFn: () => usersService.list(params), placeholderData: keepPreviousData });

export const useUser = (id?: string) =>
  useQuery({ queryKey: queryKeys.users.detail(id ?? ""), queryFn: () => usersService.getById(id!), enabled: !!id });

function useUserMutation<TVars, TData>(fn: (v: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users.all });
      qc.invalidateQueries({ queryKey: queryKeys.activityLogs.all });
    },
  });
}

export const useCreateUser = () => useUserMutation((data: CreateUserInput) => usersService.create(data));
export const useUpdateUser = () => useUserMutation(({ id, data }: { id: string; data: UpdateUserInput }) => usersService.update(id, data));
export const useSoftDeleteUser = () => useUserMutation((id: string) => usersService.softDelete(id));
export const useRestoreUser = () => useUserMutation((id: string) => usersService.restore(id));
