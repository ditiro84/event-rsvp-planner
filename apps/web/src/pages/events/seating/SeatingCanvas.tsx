import { forwardRef } from "react";
import { Circle, Ellipse, Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import type Konva from "konva";
import type { LayoutObjectRecord, TableRecord, VenueLayoutRecord } from "@/types";
import { computeSeatPositions, LAYOUT_OBJECT_COLORS, LAYOUT_OBJECT_LABELS } from "./seatGeometry";

const BRAND = "#4f46e5";
const SEAT_EMPTY = "#ffffff";
const SEAT_STROKE = "#94a3b8";
const SEAT_VIP = "#eab308";

interface Props {
  layout: VenueLayoutRecord;
  tables: TableRecord[];
  selectedTableId: string | null;
  selectedObjectId: string | null;
  onSelectTable: (id: string | null) => void;
  onSelectObject: (id: string | null) => void;
  onTableDragEnd: (id: string, x: number, y: number) => void;
  onObjectDragEnd: (id: string, x: number, y: number) => void;
  onSeatClick: (tableId: string, seatId: string, occupied: boolean) => void;
}

export const SeatingCanvas = forwardRef<Konva.Stage, Props>(function SeatingCanvas(
  {
    layout,
    tables,
    selectedTableId,
    selectedObjectId,
    onSelectTable,
    onSelectObject,
    onTableDragEnd,
    onObjectDragEnd,
    onSeatClick,
  },
  ref
) {
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
    <Stage ref={ref} width={canvasWidth} height={canvasHeight} className="rounded-lg">
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
      draggable
      name="decor-group"
      id={object.id}
      onClick={onSelect}
      onTap={onSelect}
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
  onSeatClick: (tableId: string, seatId: string, occupied: boolean) => void;
}) {
  const seatPositions = computeSeatPositions(table.shape, table.width, table.height, table.seats.length);
  const isRound = table.shape === "ROUND" || table.shape === "OVAL";

  return (
    <Group
      x={table.x}
      y={table.y}
      draggable
      name="table-group"
      id={table.id}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      {isRound ? (
        <Ellipse
          radiusX={table.width / 2}
          radiusY={table.height / 2}
          fill="#f1f5f9"
          stroke={selected ? BRAND : "#cbd5e1"}
          strokeWidth={selected ? 3 : 1.5}
        />
      ) : (
        <Rect
          x={-table.width / 2}
          y={-table.height / 2}
          width={table.width}
          height={table.height}
          fill="#f1f5f9"
          stroke={selected ? BRAND : "#cbd5e1"}
          strokeWidth={selected ? 3 : 1.5}
          cornerRadius={6}
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
        text={`${table.seats.reduce((sum, s) => (s.assignment ? sum + 1 + s.assignment.guest.additionalGuestsCount : sum), 0)}/${table.capacity}`}
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
        const occupied = !!seat.assignment;
        const fill = occupied ? (seat.assignment!.guest.isVip ? SEAT_VIP : BRAND) : SEAT_EMPTY;
        const plusOnes = occupied ? seat.assignment!.guest.additionalGuestsCount : 0;
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
                onSeatClick(table.id, seat.id, occupied);
              }}
              onTap={(e) => {
                e.cancelBubble = true;
                onSeatClick(table.id, seat.id, occupied);
              }}
            />
            {occupied && (
              <Text
                text={seat.assignment!.guest.firstName.charAt(0) + seat.assignment!.guest.lastName.charAt(0)}
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
            {plusOnes > 0 && (
              <Group listening={false}>
                <Circle x={pos.x + 9} y={pos.y - 9} radius={7} fill="#f97316" stroke="#ffffff" strokeWidth={1} />
                <Text
                  text={`+${plusOnes}`}
                  x={pos.x + 9}
                  y={pos.y - 9}
                  offsetX={plusOnes >= 10 ? 8 : 5.5}
                  offsetY={4.5}
                  fontSize={9}
                  fontStyle="700"
                  fill="#ffffff"
                />
              </Group>
            )}
          </Group>
        );
      })}
    </Group>
  );
}
