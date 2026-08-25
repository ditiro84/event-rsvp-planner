import { useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, FileText, Table2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { exportToCsv, exportToExcel, exportToPdf, type ExportColumn } from "@/lib/exportData";

// Small self-contained dropdown (no portal/positioning library) offering
// Excel/CSV/PDF export of whatever rows the caller already has in memory --
// every admin tab fetches its full list via React Query, so there's no need
// for a dedicated export endpoint or pagination-aware fetch here.
export function ExportMenu<T>({
  data,
  columns,
  filename,
  title,
  sheetName = title,
}: {
  data: T[];
  columns: ExportColumn<T>[];
  filename: string;
  title: string;
  sheetName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const disabled = data.length === 0;

  function handle(format: "excel" | "csv" | "pdf") {
    setOpen(false);
    if (format === "excel") exportToExcel(filename, sheetName, data, columns);
    if (format === "csv") exportToCsv(filename, data, columns);
    if (format === "pdf") exportToPdf(filename, title, data, columns);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-soft transition-colors hover:border-brand-600 hover:bg-brand-50 hover:text-brand-600",
          "disabled:cursor-not-allowed disabled:opacity-40"
        )}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Download className="h-3.5 w-3.5" />
        Export
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-card">
          <button
            onClick={() => handle("excel")}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-success-600" />
            Excel (.xlsx)
          </button>
          <button
            onClick={() => handle("csv")}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <Table2 className="h-4 w-4 text-brand-600" />
            CSV
          </button>
          <button
            onClick={() => handle("pdf")}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <FileText className="h-4 w-4 text-danger-600" />
            PDF
          </button>
        </div>
      )}
    </div>
  );
}
