import { useRef, useState } from "react";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { getApiErrorMessage } from "@/lib/api";
import { useImportGuestsCsv } from "@/hooks/useGuests";

export function CsvImportModal({ open, onClose, eventId }: { open: boolean; onClose: () => void; eventId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const importCsv = useImportGuestsCsv(eventId);

  async function handleImport() {
    if (!file) return;
    try {
      const result = await importCsv.mutateAsync(file);
      toast.success(`Imported ${result.imported} guests`);
      setFile(null);
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Import guests from CSV">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Upload a CSV file with columns: <code className="rounded bg-slate-100 px-1">firstName, lastName, email, phone, groupName,
          isVip, mealPreference, dietaryRequirements, accessibilityRequirements, specialNotes</code>. Only firstName and
          lastName are required.
        </p>
        <div
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-6 py-8 text-center hover:border-brand-400"
        >
          <UploadCloud className="h-8 w-8 text-slate-400" />
          <p className="mt-2 text-sm font-medium text-slate-700">{file ? file.name : "Click to choose a CSV file"}</p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleImport} isLoading={importCsv.isPending} disabled={!file}>
            Import guests
          </Button>
        </div>
      </div>
    </Modal>
  );
}
