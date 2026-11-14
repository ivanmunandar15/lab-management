"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, FlaskConical } from "lucide-react";
import {  BrandLogo } from "@/components/layout/brand-logo";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { getNavForRole, type NavItem } from "./nav-items";
import type { Role } from "@/types/erd";

interface Props {
  role: Role;
  collapsed: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
}

function NavLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
        collapsed && "justify-center px-0",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
    </Link>
  );
}

export function SidebarContent({ role, collapsed, onNavigate, onToggleCollapse }: Props) {
  const { main, admin } = getNavForRole(role);
  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-16 shrink-0 items-center gap-3 border-b px-4", collapsed && "justify-center px-0")}>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg text-primary-foreground">
          <BrandLogo className="size-10" aria-hidden="true" />
        </div>
        {!collapsed && <span className="text-sm font-semibold leading-tight">{APP_NAME}</span>}
      </div>

      <nav aria-label="Menu utama" className="flex-1 space-y-6 overflow-y-auto p-3">
        <ul className="space-y-1">
          {main.map((item) => <li key={item.href}><NavLink item={item} collapsed={collapsed} onNavigate={onNavigate} /></li>)}
        </ul>
        {admin.length > 0 && (
          <div>
            {collapsed ? <hr className="mb-3" /> : <p className="mb-2 px-3 text-xs font-semibold text-muted-foreground">Administrasi</p>}
            <ul className="space-y-1">
              {admin.map((item) => <li key={item.href}><NavLink item={item} collapsed={collapsed} onNavigate={onNavigate} /></li>)}
            </ul>
          </div>
        )}
      </nav>

      {onToggleCollapse && (
        <div className="border-t p-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Perluas sidebar" : "Lipat sidebar"}
            className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground", collapsed && "justify-center px-0")}
          >
            {collapsed ? <ChevronsRight className="size-5" /> : <><ChevronsLeft className="size-5" /> Lipat sidebar</>}
          </button>
        </div>
      )}
    </div>
  );
}
