"use client";
import Link from "next/link";
import { Menu, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "./breadcrumb";
import { GlobalSearch } from "./global-search";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import type { ShellUser } from "./app-shell";

export function Header({ user, onOpenMenu }: { user: ShellUser; onOpenMenu: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur md:gap-3 md:px-8">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenMenu} aria-label="Buka menu">
        <Menu />
      </Button>
      <div className="min-w-0 flex-1"><Breadcrumb /></div>
      <GlobalSearch role={user.role} />
      <Button asChild size="lg" className="hidden sm:inline-flex">
        <Link href="/scan"><QrCode className="!size-5" /> Scan QR</Link>
      </Button>
      <NotificationBell userId={user.id} />
      <ThemeToggle />
      <UserMenu user={user} />
    </header>
  );
}
