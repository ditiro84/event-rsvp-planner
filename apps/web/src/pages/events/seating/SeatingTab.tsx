import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import { toast } from "sonner";
import { FileText, Magnet, Plus, RotateCcw as ResetViewIcon, Undo2, Redo2, ZoomIn, ZoomOut } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { getApiErrorMessage } from "@/lib/api";
import {
  useAssignGuest,
  useCreateLayoutObject,
  useCreateTable,
  useExportSeatingPdf,
  useSeatingMap,
  useUnassignGuest,
  useUnassignPartyMember,
  useUpdateLayoutObject,
  useUpdateTable,
} from "@/hooks/useSeating";
import type { LayoutObjectRecord, SeatRecord, TableRecord } from "@/types";
import { clampScale, SeatingCanvas, type CanvasView } from "./SeatingCanvas";
import { GuestSidebar } from "./GuestSidebar";
import { AddTableModal } from "./AddTableModal";
import { ObjectSelectionPanel, TableSelectionPanel } from "./SelectionPanel";
import { LAYOUT_OBJECT_LABELS } from "./seatGeometry";

// Undo/redo intentionally only covers reversible, "oops, wrong spot" style
// edits: moving a table/object, rotating it, and assigning/unassigning a
// primary guest. Create/delete/rename/capacity/shape changes are left out --
// those have their own confirmation UX (e.g. delete asks first) and aren't
// the kind of accidental slip undo is meant to fix.
interface HistoryEntry {
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

function snapToGridValue(value: number, gridSize: number) {
  return gridSize > 0 ? Math.round(value / gridSize) * gridSize : value;
}

const DEFAULT_VIEW: CanvasView = { scale: 1, x: 0, y: 0 };

export function SeatingTab({ eventId }: { eventId: string }) {
  const { data, isLoading } = useSeatingMap(eventId);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [showAddTable, setShowAddTable] = useState(false);
  const [decorType, setDecorType] = useState("STAGE");
  const [view, setView] = useState<CanvasView>(DEFAULT_VIEW);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const stageRef = useRef<Konva.Stage>(null);

  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);
  const [isTimeTraveling, setIsTimeTraveling] = useState(false);

  const updateTable = useUpdateTable(eventId);
  const createTable = useCreateTable(eventId);
  const updateObject = useUpdateLayoutObject(eventId);
  const createObject = useCreateLayoutObject(eventId);
  const assignGuest = useAssignGuest(eventId);
  const unassignGuest = useUnassignGuest(eventId);
  const unassignPartyMember = useUnassignPartyMember(eventId);
  const exportPdf = useExportSeatingPdf(eventId);

  const selectedTable = useMemo(
    () => data?.tables.find((t) => t.id === selectedTableId) ?? null,
    [data, selectedTableId]
  );
  const selectedObject = useMemo(
    () => data?.layout.objects.find((o) => o.id === selectedObjectId) ?? null,
    [data, selectedObjectId]
  );

  function pushHistory(entry: HistoryEntry) {
    setUndoStack((s) => [...s, entry]);
    setRedoStack([]);
  }

  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0 || isTimeTraveling) return;
    const entry = undoStack[undoStack.length - 1];
    setIsTimeTraveling(true);
    try {
      await entry.undo();
      setUndoStack((s) => s.slice(0, -1));
      setRedoStack((s) => [...s, entry]);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setIsTimeTraveling(false);
    }
  }, [undoStack, isTimeTraveling]);

  const handleRedo = useCallback(async () => {
    if (redoStack.length === 0 || isTimeTraveling) return;
    const entry = redoStack[redoStack.length - 1];
    setIsTimeTraveling(true);
    try {
      await entry.redo();
      setRedoStack((s) => s.slice(0, -1));
      setUndoStack((s) => [...s, entry]);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setIsTimeTraveling(false);
    }
  }, [redoStack, isTimeTraveling]);

  // Ctrl/Cmd+Z to undo, Ctrl/Cmd+Shift+Z (or Ctrl+Y) to redo -- skipped while
  // focus is in a text field so it doesn't fight with normal text editing.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isEditable =
        !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isEditable) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "z" && e.shiftKey) {
        e.preventDefault();
        void handleRedo();
      } else if (key === "z") {
        e.preventDefault();
        void handleUndo();
      } else if (key === "y") {
        e.preventDefault();
        void handleRedo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleUndo, handleRedo]);

  if (isLoading || !data) return <Spinner />;

  const gridSize = data.layout.gridSize;

  async function handleTableDragEnd(id: string, x: number, y: number) {
    const table = data!.tables.find((t) => t.id === id);
    if (!table) return;
    const nx = snapEnabled ? snapToGridValue(x, gridSize) : x;
    const ny = snapEnabled ? snapToGridValue(y, gridSize) : y;
    const from = { x: table.x, y: table.y };
    try {
      await updateTable.mutateAsync({ tableId: id, input: { x: nx, y: ny } });
      pushHistory({
        undo: async () => {
          await updateTable.mutateAsync({ tableId: id, input: { x: from.x, y: from.y } });
        },
        redo: async () => {
          await updateTable.mutateAsync({ tableId: id, input: { x: nx, y: ny } });
        },
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleObjectDragEnd(id: string, x: number, y: number) {
    const object = data!.layout.objects.find((o) => o.id === id);
    if (!object) return;
    const nx = snapEnabled ? snapToGridValue(x, gridSize) : x;
    const ny = snapEnabled ? snapToGridValue(y, gridSize) : y;
    const from = { x: object.x, y: object.y };
    try {
      await updateObject.mutateAsync({ objectId: id, input: { x: nx, y: ny } });
      pushHistory({
        undo: async () => {
          await updateObject.mutateAsync({ objectId: id, input: { x: from.x, y: from.y } });
        },
        redo: async () => {
          await updateObject.mutateAsync({ objectId: id, input: { x: nx, y: ny } });
        },
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleRotateTable(table: TableRecord, delta: number) {
    const from = table.rotation;
    const to = ((table.rotation + delta) % 360 + 360) % 360;
    try {
      await updateTable.mutateAsync({ tableId: table.id, input: { rotation: to } });
      pushHistory({
        undo: async () => {
          await updateTable.mutateAsync({ tableId: table.id, input: { rotation: from } });
        },
        redo: async () => {
          await updateTable.mutateAsync({ tableId: table.id, input: { rotation: to } });
        },
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleRotateObject(object: LayoutObjectRecord, delta: number) {
    const from = object.rotation;
    const to = ((object.rotation + delta) % 360 + 360) % 360;
    try {
      await updateObject.mutateAsync({ objectId: object.id, input: { rotation: to } });
      pushHistory({
        undo: async () => {
          await updateObject.mutateAsync({ objectId: object.id, input: { rotation: from } });
        },
        redo: async () => {
          await updateObject.mutateAsync({ objectId: object.id, input: { rotation: to } });
        },
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  // Duplicating is a create, so -- consistent with the rest of this app --
  // it isn't tracked in the undo stack; deleting the copy is how you "undo" it.
  async function handleDuplicateTable(table: TableRecord) {
    try {
      await createTable.mutateAsync({
        name: `${table.name} copy`,
        shape: table.shape,
        capacity: table.capacity,
        x: table.x + gridSize || table.x + 30,
        y: table.y + gridSize || table.y + 30,
        width: table.width,
        height: table.height,
        rotation: table.rotation,
      });
      toast.success("Table duplicated");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleDuplicateObject(object: LayoutObjectRecord) {
    try {
      await createObject.mutateAsync({
        type: object.type,
        label: object.label,
        x: object.x + gridSize || object.x + 30,
        y: object.y + gridSize || object.y + 30,
        width: object.width,
        height: object.height,
        rotation: object.rotation,
      });
      toast.success("Duplicated");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleSeatClick(tableId: string, seat: SeatRecord) {
    try {
      if (seat.assignment) {
        // Unseats the primary guest and every named party member ("+1")
        // that came with them -- they were seated together as a unit.
        const { guestId } = seat.assignment;
        const seatId = seat.id;
        await unassignGuest.mutateAsync(guestId);
        toast.success("Guest unseated");
        pushHistory({
          undo: async () => {
            await assignGuest.mutateAsync({ guestId, tableId, seatId });
          },
          redo: async () => {
            await unassignGuest.mutateAsync(guestId);
          },
        });
      } else if (seat.partyAssignment) {
        // Unseats just this one named plus-one, leaving the primary guest
        // and any other party members exactly where they are.
        await unassignPartyMember.mutateAsync(seat.partyAssignment.partyMemberId);
        toast.success(`${seat.partyAssignment.partyMember.fullName} unseated`);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleAddDecor() {
    try {
      await createObject.mutateAsync({
        type: decorType,
        x: 40,
        y: 40,
        width: decorType === "DANCE_FLOOR" ? 180 : 120,
        height: decorType === "DANCE_FLOOR" ? 180 : 80,
      });
      toast.success(`${LAYOUT_OBJECT_LABELS[decorType]} added`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  function assignGuestToTable(guestId: string, tableId: string, seatId?: string) {
    assignGuest.mutate(
      { guestId, tableId, seatId },
      {
        onSuccess: (result) => {
          if (result.warning) toast.warning(result.warning);
          else toast.success(result.partySize > 1 ? `Guest + party of ${result.partySize - 1} seated` : "Guest seated");
          pushHistory({
            undo: async () => {
              await unassignGuest.mutateAsync(guestId);
            },
            redo: async () => {
              await assignGuest.mutateAsync({ guestId, tableId, seatId });
            },
          });
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      }
    );
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const guestId = e.dataTransfer.getData("text/plain");
    if (!guestId) return;
    const stage = stageRef.current;
    if (!stage) return;

    const rect = stage.container().getBoundingClientRect();
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const shape = stage.getIntersection(pos);
    if (!shape) {
      toast.error("Drop the guest onto a table");
      return;
    }

    let tableId: string | undefined;
    let seatId: string | undefined;
    if (shape.name() === "seat-circle") {
      seatId = shape.id();
      tableId = shape.getParent()?.id();
    } else {
      const group = shape.findAncestor(".table-group", true);
      tableId = group?.id();
    }

    if (!tableId) {
      toast.error("Drop the guest onto a table");
      return;
    }

    assignGuestToTable(guestId, tableId, seatId);
  }

  function zoomBy(factor: number) {
    setView((v) => ({ ...v, scale: clampScale(v.scale * factor) }));
  }

  const canUndo = undoStack.length > 0 && !isTimeTraveling;
  const canRedo = redoStack.length > 0 && !isTimeTraveling;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl2 border border-slate-200/80 bg-white p-3 shadow-soft">
        <Button size="sm" onClick={() => setShowAddTable(true)}>
          <Plus className="h-4 w-4" />
          Add table
        </Button>
        <div className="flex items-center gap-2">
          <Select value={decorType} onChange={(e) => setDecorType(e.target.value)} className="w-40">
            {Object.entries(LAYOUT_OBJECT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Button size="sm" variant="secondary" onClick={handleAddDecor}>
            <Plus className="h-4 w-4" />
            Add decor
          </Button>
        </div>

        <div className="h-6 w-px bg-slate-200" aria-hidden="true" />

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        <div className="h-6 w-px bg-slate-200" aria-hidden="true" />

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.2)}
            aria-label="Zoom out"
            title="Zoom out"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-xs tabular-nums text-slate-500">{Math.round(view.scale * 100)}%</span>
          <button
            type="button"
            onClick={() => zoomBy(1.2)}
            aria-label="Zoom in"
            title="Zoom in"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView(DEFAULT_VIEW)}
            aria-label="Reset view"
            title="Reset view"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <ResetViewIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="h-6 w-px bg-slate-200" aria-hidden="true" />

        <button
          type="button"
          onClick={() => setSnapEnabled((s) => !s)}
          aria-pressed={snapEnabled}
          title="Snap to grid"
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium",
            snapEnabled ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          )}
        >
          <Magnet className="h-4 w-4" />
          Snap
        </button>

        <Button size="sm" variant="secondary" onClick={() => exportPdf.mutate()} isLoading={exportPdf.isPending} className="ml-auto">
          <FileText className="h-4 w-4" />
          Export PDF
        </Button>
        <p className="w-full text-xs text-slate-500">
          Scroll to zoom &middot; drag empty space to pan &middot; drag guests onto a table &middot; click a seat to
          unassign &middot; click empty canvas to deselect
        </p>
      </div>

      <div className="flex items-start gap-4">
        <div className="w-64 shrink-0 overflow-hidden rounded-xl2 border border-slate-200/80 bg-white shadow-card" style={{ maxHeight: "70vh" }}>
          <GuestSidebar guests={data.unassignedGuests} tables={data.tables} onAssign={(guestId, tableId) => assignGuestToTable(guestId, tableId)} />
        </div>

        <div
          className="flex-1 overflow-hidden rounded-xl2 border border-slate-200/80 bg-slate-50 shadow-card"
          style={{ maxHeight: "70vh" }}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <SeatingCanvas
            ref={stageRef}
            layout={data.layout}
            tables={data.tables}
            selectedTableId={selectedTableId}
            selectedObjectId={selectedObjectId}
            view={view}
            onViewChange={setView}
            onSelectTable={(id) => {
              setSelectedTableId(id);
              setSelectedObjectId(null);
            }}
            onSelectObject={(id) => {
              setSelectedObjectId(id);
              setSelectedTableId(null);
            }}
            onTableDragEnd={handleTableDragEnd}
            onObjectDragEnd={handleObjectDragEnd}
            onSeatClick={handleSeatClick}
          />
        </div>

        {selectedTable && (
          <TableSelectionPanel
            table={selectedTable}
            eventId={eventId}
            onClose={() => setSelectedTableId(null)}
            onRotate={handleRotateTable}
            onDuplicate={handleDuplicateTable}
            isRotating={updateTable.isPending}
            isDuplicating={createTable.isPending}
          />
        )}
        {selectedObject && (
          <ObjectSelectionPanel
            object={selectedObject}
            eventId={eventId}
            onClose={() => setSelectedObjectId(null)}
            onRotate={handleRotateObject}
            onDuplicate={handleDuplicateObject}
            isRotating={updateObject.isPending}
            isDuplicating={createObject.isPending}
          />
        )}
      </div>

      <AddTableModal open={showAddTable} onClose={() => setShowAddTable(false)} eventId={eventId} />
    </div>
  );
}
