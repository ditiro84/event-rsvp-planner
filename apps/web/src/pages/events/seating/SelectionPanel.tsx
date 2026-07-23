import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, RotateCcw, RotateCw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getApiErrorMessage } from "@/lib/api";
import {
  useDeleteLayoutObject,
  useDeleteTable,
  useUpdateLayoutObject,
  useUpdateTable,
} from "@/hooks/useSeating";
import type { LayoutObjectRecord, TableRecord } from "@/types";
import { LAYOUT_OBJECT_LABELS, TABLE_SHAPE_LABELS } from "./seatGeometry";

export function TableSelectionPanel({
  table,
  eventId,
  onClose,
  onRotate,
  onDuplicate,
  onUnassignGuest,
  onUnassignPartyMember,
  isRotating,
  isDuplicating,
}: {
  table: TableRecord;
  eventId: string;
  onClose: () => void;
  onRotate: (table: TableRecord, deltaDegrees: number) => void;
  onDuplicate: (table: TableRecord) => void;
  // Keyboard/screen-reader-accessible alternative to "click a seat on the
  // canvas to unassign" -- the canvas is an unlabeled <canvas> element with
  // no way to reach individual seats without a mouse.
  onUnassignGuest: (guestId: string, seatId: string, name: string) => void;
  onUnassignPartyMember: (partyMemberId: string, name: string) => void;
  isRotating?: boolean;
  isDuplicating?: boolean;
}) {
  const [name, setName] = useState(table.name);
  const [shape, setShape] = useState(table.shape);
  const [capacity, setCapacity] = useState(table.capacity);
  const updateTable = useUpdateTable(eventId);
  const deleteTable = useDeleteTable(eventId);

  useEffect(() => {
    setName(table.name);
    setShape(table.shape);
    setCapacity(table.capacity);
  }, [table.id, table.name, table.shape, table.capacity]);

  async function handleSave() {
    try {
      const result = await updateTable.mutateAsync({ tableId: table.id, input: { name, shape, capacity } });
      if (result.unassignedGuestNames.length > 0) {
        toast.warning(`Freed seats for: ${result.unassignedGuestNames.join(", ")}`);
      } else {
        toast.success("Table updated");
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${table.name}"? Seated guests will be unassigned.`)) return;
    try {
      await deleteTable.mutateAsync(table.id);
      toast.success("Table deleted");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  const occupied = table.seats.filter((s) => s.assignment || s.partyAssignment).length;
  const available = Math.max(table.capacity - occupied, 0);

  return (
    <div className="w-full max-w-none shrink-0 rounded-xl2 border border-slate-200/80 bg-white p-4 shadow-card sm:max-w-xs">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{table.name}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        {occupied} / {table.capacity} seats occupied &middot; {available} available
      </p>
      <ProgressBar value={occupied} max={table.capacity || 1} accent={occupied >= table.capacity ? "warning" : "brand"} className="mb-4" />
      <div className="space-y-3">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Shape">
          <Select value={shape} onChange={(e) => setShape(e.target.value as TableRecord["shape"])}>
            {Object.entries(TABLE_SHAPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Capacity" hint={`${occupied} seated currently`}>
          <Input type="number" min={1} max={40} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
        </Field>
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={handleSave} isLoading={updateTable.isPending} className="flex-1">
            Save
          </Button>
          <Button size="sm" variant="danger" onClick={handleDelete} isLoading={deleteTable.isPending}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rotation</span>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => onRotate(table, -15)}
              disabled={isRotating}
              aria-label="Rotate table left 15 degrees"
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <span className="w-10 text-center text-xs tabular-nums text-slate-600">{table.rotation}&deg;</span>
            <button
              type="button"
              onClick={() => onRotate(table, 15)}
              disabled={isRotating}
              aria-label="Rotate table right 15 degrees"
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onDuplicate(table)}
          isLoading={isDuplicating}
          className="w-full"
        >
          <Copy className="h-4 w-4" />
          Duplicate table
        </Button>

        {occupied > 0 && (
          <div className="border-t border-slate-100 pt-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Seated here</p>
            <ul className="space-y-1 text-sm text-slate-700">
              {table.seats
                .filter((s) => s.assignment || s.partyAssignment)
                .map((s) => {
                  const name = s.assignment
                    ? `${s.assignment.guest.firstName} ${s.assignment.guest.lastName}`
                    : s.partyAssignment!.partyMember.fullName;
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          s.assignment
                            ? onUnassignGuest(s.assignment.guestId, s.id, name)
                            : onUnassignPartyMember(s.partyAssignment!.partyMemberId, name)
                        }
                        aria-label={`Unseat ${name}`}
                        className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-danger-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function ObjectSelectionPanel({
  object,
  eventId,
  onClose,
  onRotate,
  onDuplicate,
  isRotating,
  isDuplicating,
}: {
  object: LayoutObjectRecord;
  eventId: string;
  onClose: () => void;
  onRotate: (object: LayoutObjectRecord, deltaDegrees: number) => void;
  onDuplicate: (object: LayoutObjectRecord) => void;
  isRotating?: boolean;
  isDuplicating?: boolean;
}) {
  const [label, setLabel] = useState(object.label ?? "");
  const [type, setType] = useState(object.type);
  const [width, setWidth] = useState(object.width);
  const [height, setHeight] = useState(object.height);
  const updateObject = useUpdateLayoutObject(eventId);
  const deleteObject = useDeleteLayoutObject(eventId);

  useEffect(() => {
    setLabel(object.label ?? "");
    setType(object.type);
    setWidth(object.width);
    setHeight(object.height);
  }, [object.id, object.label, object.type, object.width, object.height]);

  async function handleSave() {
    try {
      await updateObject.mutateAsync({ objectId: object.id, input: { label: label || null, type, width, height } });
      toast.success("Updated");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleDelete() {
    try {
      await deleteObject.mutateAsync(object.id);
      toast.success("Removed");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <div className="w-full max-w-none shrink-0 rounded-xl2 border border-slate-200/80 bg-white p-4 shadow-card sm:max-w-xs">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Object settings</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3">
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value as LayoutObjectRecord["type"])}>
            {Object.entries(LAYOUT_OBJECT_LABELS).map(([value, l]) => (
              <option key={value} value={value}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Label (optional)">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={LAYOUT_OBJECT_LABELS[type]} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Width">
            <Input type="number" min={20} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
          </Field>
          <Field label="Height">
            <Input type="number" min={20} value={height} onChange={(e) => setHeight(Number(e.target.value))} />
          </Field>
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={handleSave} isLoading={updateObject.isPending} className="flex-1">
            Save
          </Button>
          <Button size="sm" variant="danger" onClick={handleDelete} isLoading={deleteObject.isPending}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rotation</span>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => onRotate(object, -15)}
              disabled={isRotating}
              aria-label="Rotate object left 15 degrees"
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <span className="w-10 text-center text-xs tabular-nums text-slate-600">{object.rotation}&deg;</span>
            <button
              type="button"
              onClick={() => onRotate(object, 15)}
              disabled={isRotating}
              aria-label="Rotate object right 15 degrees"
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onDuplicate(object)}
          isLoading={isDuplicating}
          className="w-full"
        >
          <Copy className="h-4 w-4" />
          Duplicate
        </Button>
      </div>
    </div>
  );
}
