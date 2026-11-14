import type { Metadata } from "next";
import { EmailLogsPage } from "@/components/features/email/email-logs-page";

export const metadata: Metadata = { title: "Log Email" };

export default function Page() {
  return <EmailLogsPage />;
}
