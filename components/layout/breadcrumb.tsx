"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { BREADCRUMB_LABELS } from "./nav-items";

export function Breadcrumb() {
  const segments = usePathname().split("/").filter(Boolean);
  let acc = "";
  const crumbs = segments.map((seg) => {
    acc += `/${seg}`;
    const label = BREADCRUMB_LABELS[seg] ?? "Detail";
    return { href: acc, label };
  });

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <li className="hidden sm:block">
          <Link href="/dashboard" aria-label="Beranda" className="flex items-center rounded hover:text-foreground">
            <Home className="size-4" />
          </Link>
        </li>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.href} className={last ? "flex min-w-0 items-center gap-1.5" : "hidden items-center gap-1.5 sm:flex"}>
              <ChevronRight className="hidden size-3.5 sm:block" aria-hidden="true" />
              {last ? (
                <span aria-current="page" className="truncate font-medium text-foreground">{c.label}</span>
              ) : (
                <Link href={c.href} className="rounded hover:text-foreground">{c.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
