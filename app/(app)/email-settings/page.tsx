import type { Metadata } from "next";
import { EmailSettingsPage } from "@/components/features/email/email-settings-page";

export const metadata: Metadata = { title: "Pengaturan Email" };

export default function Page() {
  return <EmailSettingsPage />;
}
