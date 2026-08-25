import { utils, writeFile } from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Shared export helpers for admin data tables -- Excel/CSV both go through
// SheetJS (one sheet built once, exported two ways), PDF goes through
// jsPDF + autotable for a simple printable grid. All client-side: the admin
// tabs already have the full dataset in memory via React Query, so there's
// no need for a dedicated export endpoint.

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

function toPlainRows<T>(data: T[], columns: ExportColumn<T>[]) {
  return data.map((row) => {
    const out: Record<string, string | number> = {};
    for (const col of columns) out[col.header] = col.value(row);
    return out;
  });
}

function downloadBlob(content: BlobPart, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToExcel<T>(filename: string, sheetName: string, data: T[], columns: ExportColumn<T>[]) {
  const sheet = utils.json_to_sheet(toPlainRows(data, columns));
  const book = utils.book_new();
  // Excel caps sheet names at 31 characters.
  utils.book_append_sheet(book, sheet, sheetName.slice(0, 31));
  writeFile(book, `${filename}.xlsx`);
}

export function exportToCsv<T>(filename: string, data: T[], columns: ExportColumn<T>[]) {
  const sheet = utils.json_to_sheet(toPlainRows(data, columns));
  const csv = utils.sheet_to_csv(sheet);
  downloadBlob(csv, `${filename}.csv`, "text/csv;charset=utf-8;");
}

export function exportToPdf<T>(filename: string, title: string, data: T[], columns: ExportColumn<T>[]) {
  const doc = new jsPDF({ orientation: columns.length > 5 ? "landscape" : "portrait" });
  doc.setFontSize(14);
  doc.setTextColor(17, 11, 41);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(144, 139, 159);
  doc.text(`Exported ${new Date().toLocaleString()}`, 14, 22);
  autoTable(doc, {
    startY: 27,
    head: [columns.map((c) => c.header)],
    body: data.map((row) => columns.map((c) => String(c.value(row)))),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [99, 59, 254] }, // brand-600
    margin: { left: 14, right: 14 },
  });
  doc.save(`${filename}.pdf`);
}
