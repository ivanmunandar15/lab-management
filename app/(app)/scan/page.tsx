import type { Metadata } from "next";
import { ScannerScreen } from "@/components/features/scan/scanner-screen";

export const metadata: Metadata = { title: "Scan QR" };

export default function ScanPage() {
  return <ScannerScreen />;
}
