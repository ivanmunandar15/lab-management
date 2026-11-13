"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LayoutDashboard, Menu, QrCode, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadCount } from "./notification-bell";
import { Bell } from "lucide-react";

function Item({ href, label, icon: Icon, badge }: { href: string; label: string; icon: LucideIcon; badge?: number }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={cn("relative flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
      <Icon className="size-5" aria-hidden="true" />
      {label}
      {!!badge && badge > 0 && (
        <span className="absolute right-[28%] top-1 rounded-full bg-destructive px-1 text-[10px] leading-4 text-destructive-foreground">{badge > 9 ? "9+" : badge}</span>
      )}
    </Link>
  );
}

export function BottomBar({ userId, onOpenMenu }: { userId: string; onOpenMenu: () => void }) {
  const { data: unread = 0 } = useUnreadCount(userId);
  return (
    <nav aria-label="Navigasi cepat" className="fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="grid grid-cols-5 items-end">
        <Item href="/dashboard" label="Beranda" icon={LayoutDashboard} />
        <Item href="/borrowing" label="Borrowing" icon={ClipboardList} />
        <Link href="/scan" aria-label="Scan QR" className="flex flex-col items-center pb-1">
          <span className="-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background">
            <QrCode className="size-7" aria-hidden="true" />
          </span>
          <span className="mt-0.5 text-[11px] font-medium text-primary">Scan</span>
        </Link>
        <Item href="/notifications" label="Notifikasi" icon={Bell} badge={unread} />
        <button type="button" onClick={onOpenMenu} className="flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground">
          <Menu className="size-5" aria-hidden="true" /> Menu
        </button>
      </div>
    </nav>
  );
}
