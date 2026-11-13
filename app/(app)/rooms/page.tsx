import type { Metadata } from "next";
import { RoomsPage } from "@/components/features/rooms/rooms-page";

export const metadata: Metadata = { title: "Ruangan" };

export default function Page() {
  return <RoomsPage />;
}
