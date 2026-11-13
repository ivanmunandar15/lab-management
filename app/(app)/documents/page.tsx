import type { Metadata } from "next";
import { DocumentsPage } from "@/components/features/documents/documents-page";

export const metadata: Metadata = { title: "Dokumen" };

export default function Page() {
  return <DocumentsPage />;
}
