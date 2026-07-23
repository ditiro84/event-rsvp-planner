import { useMemo, useRef, useState } from "react";
import type Konva from "konva";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/api";
import {
  useAssignGuest,
  useCreateLayoutObject,
  useSeatingMap,
  useUnassignGuest,
  useUpdateLayoutObject,
  useUpdateTable,
} from "@/hooks/useSeating";
import { SeatingCanvas } from "./SeatingCanvas";
import { GuestSidebar } from "./GuestSidebar";
import { AddTableModal } from "./AddTableModal";
import { ObjectSelectionPanel, TableSelectionPanel } from "./SelectionPanel";
import { LAYOUT_OBJECT_LABELS } from "./seatGeometry";

export function SeatingTab({ eventId }: { eventId: string }) {
  const { data, isLoading } = useSeatingMap(eventId);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [showAddTable, setShowAddTable] = useState(false);
  const [decorType, setDecorType] = useState("STAGE");
  const stageRef = useRef<Konva.Stage>(null);

  const updateTable = useUpdateTable(eventId);
  const updateObject = useUpdateLayoutObject(eventId);
  const createObject = useCreateLayoutObject(eventId);
  const assignGuest = useAssignGuest(eventId);
  const unassignGuest = useUnassignGuest(eventId);

  const selectedTable = useMemo(
    () => data?.tables.find((t) => t.id === selectedTableId) ?? null,
    [data, selectedTableId]
  );
  const selectedObject = useMemo(
    () => data?.layout.objects.find((o) => o.id === selectedObjectId) ?? null,
    [data, selectedObjectId]
  );

  if (isLoading || !data) return <Spinner />;

  async function handleTableDragEnd(id: string, x: number, y: number) {
    try {
      await updateTable.mutateAsync({ tableId: id, input: { x, y } });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleObjectDragEnd(id: string, x: number, y: number) {
    try {
      await updateObject.mutateAsync({ objectId: id, input: { x, y } });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleSeatClick(_tableId: string, seatId: string, occupied: boolean) {
    if (!occupied) return;
    const table = data!.tables.find((t) => t.seats.some((s) => s.id === seatId));
    const seat = table?.seats.find((s) => s.id === seatId);
    const guestId = seat?.assignment?.guestId;
    if (!guestId) return;
    try {
      await unassignGuest.mutateAsync(guestId);
      toast.success("Guest unseated");
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

    assignGuest.mutate(
      { guestId, tableId, seatId },
      {
        onSuccess: (result) => {
          if (result.warning) toast.warning(result.warning);
          else toast.success(result.partySize > 1 ? `Guest + party of ${result.partySize - 1} seated` : "Guest seated");
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      }
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
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
        <p className="ml-auto text-xs text-slate-500">
          Drag tables/decor to reposition &middot; drag guests from the right onto a table &middot; click a seat to unassign
        </p>
      </div>

      <div className="flex items-start gap-4">
        <div
          className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-slate-50"
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
          <TableSelectionPanel table={selectedTable} eventId={eventId} onClose={() => setSelectedTableId(null)} />
        )}
        {selectedObject && (
          <ObjectSelectionPanel object={selectedObject} eventId={eventId} onClose={() => setSelectedObjectId(null)} />
        )}

        <div className="w-64 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white" style={{ maxHeight: "70vh" }}>
          <GuestSidebar guests={data.unassignedGuests} />
        </div>
      </div>

      <AddTableModal open={showAddTable} onClose={() => setShowAddTable(false)} eventId={eventId} />
    </div>
  );
}
