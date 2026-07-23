import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/api";
import { useCreateTable } from "@/hooks/useSeating";
import { TABLE_SHAPE_LABELS } from "./seatGeometry";

const SHAPE_DEFAULTS: Record<string, { width: number; height: number }> = {
  ROUND: { width: 120, height: 120 },
  OVAL: { width: 160, height: 100 },
  SQUARE: { width: 110, height: 110 },
  RECTANGLE: { width: 180, height: 100 },
  BANQUET: { width: 260, height: 90 },
  HEAD: { width: 260, height: 70 },
  CUSTOM: { width: 120, height: 120 },
};

export function AddTableModal({ open, onClose, eventId }: { open: boolean; onClose: () => void; eventId: string }) {
  const [name, setName] = useState("");
  const [shape, setShape] = useState("ROUND");
  const [capacity, setCapacity] = useState(8);
  const createTable = useCreateTable(eventId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Give the table a name");
      return;
    }
    const dims = SHAPE_DEFAULTS[shape] ?? SHAPE_DEFAULTS.ROUND;
    try {
      await createTable.mutateAsync({
        name: name.trim(),
        shape,
        capacity,
        x: 200,
        y: 200,
        width: dims.width,
        height: dims.height,
      });
      toast.success("Table added");
      setName("");
      setShape("ROUND");
      setCapacity(8);
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add table" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Table name" htmlFor="table-name">
          <Input id="table-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Table 1" autoFocus />
        </Field>
        <Field label="Shape" htmlFor="table-shape">
          <Select id="table-shape" value={shape} onChange={(e) => setShape(e.target.value)}>
            {Object.entries(TABLE_SHAPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Seats" htmlFor="table-capacity">
          <Input
            id="table-capacity"
            type="number"
            min={1}
            max={40}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={createTable.isPending}>
            Add table
          </Button>
        </div>
      </form>
    </Modal>
  );
}
