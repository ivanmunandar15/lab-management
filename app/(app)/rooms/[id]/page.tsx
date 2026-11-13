import type { Metadata } from "next";
import { RoomDetail } from "@/components/features/rooms/room-detail";

export const metadata: Metadata = { title: "Detail Ruangan" };

export default async function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RoomDetail id={id} />;
}
