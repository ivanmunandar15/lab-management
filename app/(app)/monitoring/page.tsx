import type { Metadata } from "next";
import { MonitoringPage } from "@/components/features/monitoring/monitoring-page";

export const metadata: Metadata = { title: "Monitoring" };

export default function Page() {
  return <MonitoringPage />;
}
