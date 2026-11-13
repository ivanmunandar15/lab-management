import type { Metadata } from "next";
import { ActivityLogPage } from "@/components/features/activity-log/activity-log-page";

export const metadata: Metadata = { title: "Activity Log" };

export default function Page() {
  return <ActivityLogPage />;
}
