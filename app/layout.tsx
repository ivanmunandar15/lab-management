import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { APP_NAME } from "@/lib/constants";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  description: "Kelola peralatan, penggunaan, kalibrasi, dan pemeliharaan laboratorium dalam satu tempat.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563EB" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1020" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
