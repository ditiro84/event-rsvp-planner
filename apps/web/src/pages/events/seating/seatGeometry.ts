// Pure geometry helpers for laying out seat dots around a table shape.
// Kept framework-free and DB-free so it's easy to reason about/tweak.

export interface Point {
  x: number;
  y: number;
}

const SEAT_OFFSET = 20; // distance the seat dot sits outside the table edge

export function computeSeatPositions(
  shape: string,
  width: number,
  height: number,
  capacity: number
): Point[] {
  if (capacity <= 0) return [];

  if (shape === "ROUND" || shape === "OVAL") {
    const rx = width / 2 + SEAT_OFFSET;
    const ry = height / 2 + SEAT_OFFSET;
    return Array.from({ length: capacity }, (_, i) => {
      const angle = (i / capacity) * Math.PI * 2 - Math.PI / 2; // start at top
      return { x: Math.cos(angle) * rx, y: Math.sin(angle) * ry };
    });
  }

  // Rectangular shapes (SQUARE, RECTANGLE, BANQUET, HEAD, CUSTOM): distribute
  // seats evenly around the perimeter, pushed outward from each edge.
  const halfW = width / 2;
  const halfH = height / 2;
  const perimeter = 2 * (width + height);
  const step = perimeter / capacity;

  const points: Point[] = [];
  for (let i = 0; i < capacity; i++) {
    let dist = (i + 0.5) * step;

    if (dist < width) {
      // top edge, left -> right
      points.push({ x: -halfW + dist, y: -halfH - SEAT_OFFSET });
      continue;
    }
    dist -= width;

    if (dist < height) {
      // right edge, top -> bottom
      points.push({ x: halfW + SEAT_OFFSET, y: -halfH + dist });
      continue;
    }
    dist -= height;

    if (dist < width) {
      // bottom edge, right -> left
      points.push({ x: halfW - dist, y: halfH + SEAT_OFFSET });
      continue;
    }
    dist -= width;

    // left edge, bottom -> top
    points.push({ x: -halfW - SEAT_OFFSET, y: halfH - dist });
  }

  return points;
}

export const LAYOUT_OBJECT_COLORS: Record<string, string> = {
  STAGE: "#a855f7",
  DANCE_FLOOR: "#ec4899",
  BAR: "#f59e0b",
  BUFFET: "#f97316",
  ENTRANCE: "#22c55e",
  EXIT: "#ef4444",
  TOILETS: "#64748b",
  DJ_BOOTH: "#6366f1",
  VIP_AREA: "#eab308",
  CUSTOM: "#94a3b8",
};

export const LAYOUT_OBJECT_LABELS: Record<string, string> = {
  STAGE: "Stage",
  DANCE_FLOOR: "Dance Floor",
  BAR: "Bar",
  BUFFET: "Buffet",
  ENTRANCE: "Entrance",
  EXIT: "Exit",
  TOILETS: "Toilets",
  DJ_BOOTH: "DJ Booth",
  VIP_AREA: "VIP Area",
  CUSTOM: "Custom",
};

export const TABLE_SHAPE_LABELS: Record<string, string> = {
  ROUND: "Round",
  SQUARE: "Square",
  RECTANGLE: "Rectangle",
  OVAL: "Oval",
  BANQUET: "Banquet",
  HEAD: "Head Table",
  CUSTOM: "Custom",
};
