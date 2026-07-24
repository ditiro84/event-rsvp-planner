import { forwardRef } from "react";
import { Circle, Ellipse, Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import type Konva from "konva";
import type { LayoutObjectRecord, SeatRecord, TableRecord, VenueLayoutRecord } from "@/types";
import { computeSeatPositions, LAYOUT_OBJECT_COLORS, LAYOUT_OBJECT_LABELS } from "./seatGeometry";

const BRAND = "#4f46e5"; // brand-600 -- kept in sync with tailwind.config.js's brand palette
const SEAT_EMPTY = "#ffffff";
const SEAT_STROKE = "#94a3b8";
const SEAT_VIP = "#eab308";
const SEAT_PLUS_ONE = "#f97316";

// "JD" from "John Doe", "J" from "Jane".
function initialsOf(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export interface CanvasView {
  scale: number;
  x: number;
  y: number;
}

interface Props {
  layout: VenueLayoutRecord;
  tables: TableRecord[];
  selectedTableId: string | null;
  selectedObjectId: string | null;
  view: CanvasView;
  onViewChange: (view: CanvasView) => void;
  onSelectTable: (id: string | null) => void;
  onSelectObject: (id: string | null) => void;
  onTableDragEnd: (id: string, x: number, y: number) => void;
  onObjectDragEnd: (id: string, x: number, y: number) => void;
  onSeatClick: (tableId: string, seat: SeatRecord) => void;
}

const MIN_SCALE = 0.4;
const MAX_SCALE = 2.5;

export function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export const SeatingCanvas = forwardRef<Konva.Stage, Props>(function SeatingCanvas(
  {
    layout,
    tables,
    selectedTableId,
    selectedObjectId,
    view,
    onViewChange,
    onSelectTable,
    onSelectObject,
    onTableDragEnd,
    onObjectDragEnd,
    onSeatClick,
  },
  ref
) {
  // Mouse-wheel zoom, centered on the cursor so the point under the pointer
  // stays put -- the standard Konva zoom-to-pointer recipe.
  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const oldScale = view.scale;
    const mousePointTo = {
      x: (pointer.x - view.x) / oldScale,
      y: (pointer.y - view.y) / oldScale,
    };
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const scaleBy = 1.06;
    const newScale = clampScale(direction > 0 ? oldScale * scaleBy : oldScale / scaleBy);

    onViewChange({
      scale: newScale,
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }

  // Clicking empty canvas (not a table/object) clears the current selection
  // -- lets the selection panel be dismissed without hunting for the X
  // button, and pairs naturally with the new pan-by-dragging-empty-space
  // behavior.
  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (e.target === e.target.getStage()) {
      onSelectTable(null);
      onSelectObject(null);
    }
  }
  const gridLines: JSX.Element[] = [];
  const { canvasWidth, canvasHeight, gridSize } = layout;
  if (gridSize > 0) {
    for (let x = 0; x <= canvasWidth; x += gridSize) {
      gridLines.push(<Line key={`gx-${x}`} points={[x, 0, x, canvasHeight]} stroke="#e2e8f0" strokeWidth={1} listening={false} />);
    }
    for (let y = 0; y <= canvasHeight; y += gridSize) {
      gridLines.push(<Line key={`gy-${y}`} points={[0, y, canvasWidth, y]} stroke="#e2e8f0" strokeWidth={1} listening={false} />);
    }
  }

  return (
    <Stage
      ref={ref}
      width={canvasWidth}
      height={canvasHeight}
      scaleX={view.scale}
      scaleY={view.scale}
      x={view.x}
      y={view.y}
      draggable
      onDragEnd={(e) => {
        if (e.target === e.target.getStage()) {
          onViewChange({ ...view, x: e.target.x(), y: e.target.y() });
        }
      }}
      onWheel={handleWheel}
      onClick={handleStageClick}
      onTap={handleStageClick}
      className="rounded-lg"
    >
      <Layer>
        <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill={layout.backgroundColor} listening={false} />
        {gridLines}
      </Layer>

      <Layer>
        {layout.objects.map((object: LayoutObjectRecord) => (
          <DecorObject
            key={object.id}
            object={object}
            selected={object.id === selectedObjectId}
            onSelect={() => onSelectObject(object.id)}
            onDragEnd={(x, y) => onObjectDragEnd(object.id, x, y)}
          />
        ))}
      </Layer>

      <Layer>
        {tables.map((table) => (
          <TableNode
            key={table.id}
            table={table}
            selected={table.id === selectedTableId}
            onSelect={() => onSelectTable(table.id)}
            onDragEnd={(x, y) => onTableDragEnd(table.id, x, y)}
            onSeatClick={onSeatClick}
          />
        ))}
      </Layer>
    </Stage>
  );
});

function DecorObject({
  object,
  selected,
  onSelect,
  onDragEnd,
}: {
  object: LayoutObjectRecord;
  selected: boolean;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
}) {
  const color = object.color || LAYOUT_OBJECT_COLORS[object.type] || "#94a3b8";
  return (
    <Group
      x={object.x}
      y={object.y}
      rotation={object.rotation}
      draggable
      name="decor-group"
      id={object.id}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      <Rect
        width={object.width}
        height={object.height}
        fill={color}
        opacity={0.25}
        stroke={color}
        strokeWidth={selected ? 3 : 1.5}
        cornerRadius={8}
      />
      <Text
        text={object.label || LAYOUT_OBJECT_LABELS[object.type] || "Object"}
        width={object.width}
        height={object.height}
        align="center"
        verticalAlign="middle"
        fontSize={13}
        fontStyle="600"
        fill="#1e293b"
        listening={false}
      />
    </Group>
  );
}

function TableNode({
  table,
  selected,
  onSelect,
  onDragEnd,
  onSeatClick,
}: {
  table: TableRecord;
  selected: boolean;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  onSeatClick: (tableId: string, seat: SeatRecord) => void;
}) {
  const seatPositions = computeSeatPositions(table.shape, table.width, table.height, table.seats.length);
  const isRound = table.shape === "ROUND" || table.shape === "OVAL";
  const occupiedCount = table.seats.filter((s) => s.assignment || s.partyAssignment).length;

  return (
    <Group
      x={table.x}
      y={table.y}
      rotation={table.rotation}
      draggable
      name="table-group"
      id={table.id}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      {isRound ? (
        <Ellipse
          radiusX={table.width / 2}
          radiusY={table.height / 2}
          fill="#f8fafc"
          stroke={selected ? BRAND : "#cbd5e1"}
          strokeWidth={selected ? 3 : 1.5}
          shadowColor={BRAND}
          shadowBlur={selected ? 14 : 0}
          shadowOpacity={0.25}
        />
      ) : (
        <Rect
          x={-table.width / 2}
          y={-table.height / 2}
          width={table.width}
          height={table.height}
          fill="#f8fafc"
          stroke={selected ? BRAND : "#cbd5e1"}
          strokeWidth={selected ? 3 : 1.5}
          cornerRadius={6}
          shadowColor={BRAND}
          shadowBlur={selected ? 14 : 0}
          shadowOpacity={0.25}
        />
      )}
      <Text
        text={table.name}
        width={table.width}
        offsetX={table.width / 2}
        height={20}
        offsetY={10}
        align="center"
        fontSize={13}
        fontStyle="600"
        fill="#334155"
        listening={false}
      />
      <Text
        text={`${occupiedCount}/${table.capacity}`}
        width={table.width}
        offsetX={table.width / 2}
        y={12}
        align="center"
        fontSize={11}
        fill="#64748b"
        listening={false}
      />

      {table.seats.map((seat, i) => {
        const pos = seatPositions[i] ?? { x: 0, y: 0 };

        // Each seat is exactly one of: the primary guest's own seat, a named
        // party member's ("+1"'s) own seat, or free. Plus-ones get their own
        // full seat dot right next to the guest who invited them, instead of
        // a badge stacked on top of someone else's seat.
        let fill = SEAT_EMPTY;
        let initials: string | null = null;
        if (seat.assignment) {
          fill = seat.assignment.guest.isVip ? SEAT_VIP : BRAND;
          initials = seat.assignment.guest.firstName.charAt(0) + seat.assignment.guest.lastName.charAt(0);
        } else if (seat.partyAssignment) {
          fill = SEAT_PLUS_ONE;
          initials = initialsOf(seat.partyAssignment.partyMember.fullName);
        }
        const occupied = !!seat.assignment || !!seat.partyAssignment;

        return (
          <Group key={seat.id}>
            <Circle
              x={pos.x}
              y={pos.y}
              radius={11}
              fill={fill}
              stroke={SEAT_STROKE}
              strokeWidth={1}
              name="seat-circle"
              id={seat.id}
              onClick={(e) => {
                e.cancelBubble = true;
                onSeatClick(table.id, seat);
              }}
              onTap={(e) => {
                e.cancelBubble = true;
                onSeatClick(table.id, seat);
              }}
            />
            {occupied && initials && (
              <Text
                text={initials}
                x={pos.x}
                y={pos.y}
                offsetX={7}
                offsetY={5}
                fontSize={10}
                fontStyle="600"
                fill="#ffffff"
                listening={false}
              />
            )}
          </Group>
        );
      })}
    </Group>
  );
}
