"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getNavForRole, SCAN_ITEM } from "./nav-items";
import type { Role } from "@/types/erd";

export function GlobalSearch({ role }: { role: Role }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { main, admin } = getNavForRole(role);
  const q = query.trim().toLowerCase();
  const results = [...main, ...admin, SCAN_ITEM].filter((i) => i.label.toLowerCase().includes(q));

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <>
      <Button
        variant="outline" onClick={() => setOpen(true)} aria-label="Buka pencarian"
        className="hidden w-64 justify-start font-normal text-muted-foreground md:inline-flex lg:w-72"
      >
        <Search /> Cari menu atau data…
        <kbd className="ml-auto rounded border bg-muted px-1.5 text-[11px]">Ctrl K</kbd>
      </Button>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Buka pencarian">
        <Search />
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
        <DialogContent className="top-[30%] max-w-xl gap-3 p-4">
          <DialogTitle className="sr-only">Pencarian global</DialogTitle>
          <DialogDescription className="sr-only">Ketik untuk mencari menu. Tekan Enter untuk membuka hasil pertama.</DialogDescription>
          <form onSubmit={(e) => { e.preventDefault(); if (results[0]) go(results[0].href); }}>
            <Input autoFocus aria-label="Kata kunci" placeholder="Cari menu…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </form>
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {results.map((r) => (
              <li key={r.href}>
                <button
                  type="button" onClick={() => go(r.href)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <r.icon className="size-4 text-muted-foreground" aria-hidden="true" /> {r.label}
                </button>
              </li>
            ))}
            {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Menu “{query}” tidak ditemukan.</li>}
          </ul>
          <p className="flex items-center gap-1.5 border-t pt-3 text-xs text-muted-foreground">
            <CornerDownLeft className="size-3.5" /> Pencarian alat, ruangan, dan dokumen akan aktif setelah modulnya dibuat.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
