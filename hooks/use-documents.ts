"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateDocumentInput } from "@/lib/schemas";
import { documentsService, type DocumentListParams } from "@/lib/services";
import { queryKeys } from "./query-keys";

export const useDocuments = (params?: DocumentListParams) =>
  useQuery({ queryKey: queryKeys.documents.list(params), queryFn: () => documentsService.list(params), placeholderData: keepPreviousData });

export const useDocument = (id?: string) =>
  useQuery({ queryKey: queryKeys.documents.detail(id ?? ""), queryFn: () => documentsService.getById(id!), enabled: !!id });

function useDocumentMutation<TVars, TData>(fn: (v: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.documents.all });
      qc.invalidateQueries({ queryKey: queryKeys.activityLogs.all });
    },
  });
}

export const useCreateDocument = () => useDocumentMutation((data: CreateDocumentInput) => documentsService.create(data));
export const useDeleteDocument = () => useDocumentMutation((id: string) => documentsService.remove(id));
