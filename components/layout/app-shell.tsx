"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BottomBar } from "./bottom-bar";
import { Header } from "./header";
import { SidebarContent } from "./sidebar-content";
import type { Role } from "@/types/erd";

export interface ShellUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

const STORAGE_KEY = "sidebar-collapsed";

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(STORAGE_KEY) === "1"); } catch { /* abaikan */ }
  }, []);
  useEffect(() => setDrawerOpen(false), [pathname]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      try { localStorage.setItem(STORAGE_KEY, c ? "0" : "1"); } catch { /* abaikan */ }
      return !c;
    });
  }

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Lewati ke konten utama
      </a>

      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden border-r bg-card transition-[width] duration-200 md:block", collapsed ? "w-[68px]" : "w-64")}>
        <SidebarContent role={user.role} collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      </aside>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent>
          <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
          <SheetDescription className="sr-only">Daftar halaman aplikasi</SheetDescription>
          <SidebarContent role={user.role} collapsed={false} onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className={cn("transition-[padding] duration-200", collapsed ? "md:pl-[68px]" : "md:pl-64")}>
        <Header user={user} onOpenMenu={() => setDrawerOpen(true)} />
        <main id="main" tabIndex={-1} className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:px-8 md:pb-10">
          {children}
        </main>
      </div>

      <BottomBar userId={user.id} onOpenMenu={() => setDrawerOpen(true)} />
    </div>
  );
}
