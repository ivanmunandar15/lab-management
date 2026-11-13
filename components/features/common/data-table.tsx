"use client";
import * as React from "react";
import {
  flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel,
  useReactTable, type ColumnDef, type ColumnFiltersState, type RowSelectionState, type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, SearchX, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";

export interface DataTableFilter {
  columnId: string;
  label: string;
  options: { label: string; value: string }[];
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getRowId?: (row: TData) => string;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  searchPlaceholder?: string;
  /** Filter dropdown per kolom (cocok persis). */
  filters?: DataTableFilter[];
  enableRowSelection?: boolean;
  bulkActions?: (selected: TData[], clearSelection: () => void) => React.ReactNode;
  toolbarActions?: React.ReactNode;
  onRowClick?: (row: TData) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  pageSizeOptions?: number[];
  /** Dipanggil saat baris hasil filter/pencarian berubah (urutan sesuai tabel, sebelum paginasi). */
  onFilteredChange?: (rows: TData[]) => void;
  /** Dipanggil saat baris yang dicentang berubah. */
  onSelectionChange?: (rows: TData[]) => void;
  /** ID kolom yang disembunyikan tetapi tetap bisa dipakai untuk filter. */
  hiddenColumns?: string[];
}

function RowCheckbox({ checked, indeterminate, onChange, label }: {
  checked: boolean; indeterminate?: boolean; onChange: (v: boolean) => void; label: string;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref} type="checkbox" aria-label={label} checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      className="size-4 cursor-pointer rounded border-input accent-primary"
    />
  );
}

export function DataTable<TData, TValue>({
  columns, data, getRowId, isLoading, error, onRetry,
  searchPlaceholder = "Cari data…", filters = [], enableRowSelection, bulkActions, toolbarActions,
  onRowClick, emptyTitle = "Belum ada data", emptyDescription, emptyAction, pageSizeOptions = [10, 20, 50], onFilteredChange, onSelectionChange, hiddenColumns,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const allColumns = React.useMemo<ColumnDef<TData, TValue>[]>(() => {
    if (!enableRowSelection) return columns;
    const select = {
      id: "__select",
      enableSorting: false,
      header: ({ table }) => (
        <RowCheckbox
          label="Pilih semua baris di halaman ini"
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onChange={(v) => table.toggleAllPageRowsSelected(v)}
        />
      ),
      cell: ({ row }) => (
        <RowCheckbox label="Pilih baris" checked={row.getIsSelected()} onChange={(v) => row.toggleSelected(v)} />
      ),
    } as ColumnDef<TData, TValue>;
    return [select, ...columns];
  }, [columns, enableRowSelection]);

  const table = useReactTable({
    data,
    columns: allColumns,
    getRowId,
    state: { sorting, columnFilters, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: !!enableRowSelection,
    defaultColumn: { filterFn: "equalsString" },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: pageSizeOptions[0] },
      columnVisibility: Object.fromEntries((hiddenColumns ?? []).map((c) => [c, false])),
    },
  });

  const filteredRows = table.getSortedRowModel().rows;
  React.useEffect(() => {
    onFilteredChange?.(filteredRows.map((r) => r.original));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRows]);

  const selected = table.getSelectedRowModel().rows.map((r) => r.original);
  React.useEffect(() => {
    onSelectionChange?.(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection]);
  const clearSelection = () => table.resetRowSelection();
  const hasActiveFilter = globalFilter !== "" || columnFilters.length > 0;
  const resetFilters = () => { setGlobalFilter(""); setColumnFilters([]); };

  const { pageIndex, pageSize } = table.getState().pagination;
  const total = table.getFilteredRowModel().rows.length;
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(total, (pageIndex + 1) * pageSize);
  const colCount = allColumns.length;

  let body: React.ReactNode;
  if (isLoading) {
    body = Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i} className="hover:bg-transparent">
        {Array.from({ length: colCount }).map((__, j) => (
          <TableCell key={j}><Skeleton className="h-5 w-full max-w-40" /></TableCell>
        ))}
      </TableRow>
    ));
  } else if (error) {
    body = (
      <TableRow className="hover:bg-transparent"><TableCell colSpan={colCount}><ErrorState onRetry={onRetry} /></TableCell></TableRow>
    );
  } else if (data.length === 0) {
    body = (
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={colCount}>
          <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
        </TableCell>
      </TableRow>
    );
  } else if (table.getRowModel().rows.length === 0) {
    body = (
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={colCount}>
          <EmptyState
            icon={SearchX}
            title="Tidak ada hasil yang cocok"
            description="Ubah kata kunci atau hapus filter untuk melihat semua data."
            action={<Button variant="outline" onClick={resetFilters}>Hapus filter</Button>}
          />
        </TableCell>
      </TableRow>
    );
  } else {
    body = table.getRowModel().rows.map((row) => (
      <TableRow
        key={row.id}
        data-state={row.getIsSelected() ? "selected" : undefined}
        onClick={onRowClick ? () => onRowClick(row.original) : undefined}
        className={onRowClick ? "cursor-pointer" : undefined}
      >
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
        ))}
      </TableRow>
    ));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Cari di tabel" placeholder={searchPlaceholder} className="pl-9"
            value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
        {filters.map((f) => (
          <NativeSelect
            key={f.columnId} aria-label={`Filter ${f.label}`}
            value={(columnFilters.find((c) => c.id === f.columnId)?.value as string) ?? ""}
            onChange={(e) => table.getColumn(f.columnId)?.setFilterValue(e.target.value || undefined)}
          >
            <option value="">{f.label}: Semua</option>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </NativeSelect>
        ))}
        {hasActiveFilter && <Button variant="ghost" size="sm" onClick={resetFilters}>Reset</Button>}
        {toolbarActions && <div className="flex items-center gap-2 sm:ml-auto">{toolbarActions}</div>}
      </div>

      {enableRowSelection && selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-primary/30 bg-primary/10 px-4 py-2 text-sm">
          <span className="font-medium">{selected.length} baris dipilih</span>
          {bulkActions?.(selected, clearSelection)}
          <Button variant="ghost" size="sm" className="ml-auto" onClick={clearSelection}>Batal pilih</Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table aria-busy={isLoading || undefined}>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((h) => {
                  const canSort = h.column.getCanSort();
                  const dir = h.column.getIsSorted();
                  return (
                    <TableHead
                      key={h.id}
                      aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : undefined}
                      className={h.column.id === "__select" ? "w-10" : undefined}
                    >
                      {h.isPlaceholder ? null : canSort ? (
                        <button
                          type="button" onClick={h.column.getToggleSortingHandler()}
                          className="-ml-2 inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-accent hover:text-foreground"
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {dir === "asc" ? <ArrowUp className="size-3.5" /> : dir === "desc" ? <ArrowDown className="size-3.5" /> : <ArrowUpDown className="size-3.5 opacity-50" />}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>{body}</TableBody>
        </Table>
      </div>

      {!isLoading && !error && data.length > 0 && (
        <div className="flex flex-col items-center gap-3 text-sm sm:flex-row sm:justify-between">
          <p className="text-muted-foreground">Menampilkan {from}–{to} dari {total} data</p>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-muted-foreground">
              Baris per halaman
              <NativeSelect className="h-8" value={pageSize} onChange={(e) => table.setPageSize(Number(e.target.value))}>
                {pageSizeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
              </NativeSelect>
            </label>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="size-8" aria-label="Halaman pertama" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}><ChevronsLeft /></Button>
              <Button variant="outline" size="icon" className="size-8" aria-label="Halaman sebelumnya" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronLeft /></Button>
              <span className="px-2 tabular-nums">{pageIndex + 1} / {Math.max(1, table.getPageCount())}</span>
              <Button variant="outline" size="icon" className="size-8" aria-label="Halaman berikutnya" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronRight /></Button>
              <Button variant="outline" size="icon" className="size-8" aria-label="Halaman terakhir" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}><ChevronsRight /></Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
