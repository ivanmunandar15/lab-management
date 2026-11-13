import { del, enc, get, post } from "@/lib/api/client";
import type { CreateDocumentInput } from "@/lib/schemas";
import type { Document, DocumentType } from "@/types/erd";

export interface DocumentListParams {
  search?: string;
  equipment_id?: string;
  type?: DocumentType;
}

export const documentsService = {
  list: (params: DocumentListParams = {}) => get<Document[]>("documents", { ...params }),
  getById: (id: string) => get<Document>(`documents/${enc(id)}`),
  /** `file_url` = data URL base64 hasil FileReader; backend memverifikasi isi file dan menyimpannya. */
  create: (input: CreateDocumentInput) => post<Document>("documents", input),
  remove: (id: string) => del<void>(`documents/${enc(id)}`),
};
