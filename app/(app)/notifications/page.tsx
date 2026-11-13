import type { Metadata } from "next";
import { NotificationsPage } from "@/components/features/notifications/notifications-page";

export const metadata: Metadata = { title: "Notifikasi" };

export default function Page() {
  return <NotificationsPage />;
}
