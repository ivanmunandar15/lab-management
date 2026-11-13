"use client";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUnreadNotificationCount } from "@/hooks/use-notifications";

export const useUnreadCount = (userId: string) => useUnreadNotificationCount(userId);

export function NotificationBell({ userId }: { userId: string }) {
  const { data: count = 0 } = useUnreadCount(userId);
  return (
    <Button asChild variant="ghost" size="icon" className="relative" aria-label={count > 0 ? `Notifikasi, ${count} belum dibaca` : "Notifikasi"}>
      <Link href="/notifications">
        <Bell />
        {count > 0 && (
          <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Link>
    </Button>
  );
}
