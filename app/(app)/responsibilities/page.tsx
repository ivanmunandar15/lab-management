import type { Metadata } from "next";
import { ResponsibilitiesPage } from "@/components/features/responsibilities/responsibilities-page";

export const metadata: Metadata = { title: "Penanggung Jawab Alat" };

export default function Page() {
  return <ResponsibilitiesPage />;
}
