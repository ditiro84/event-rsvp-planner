// "Seats around the table" illustration for the auth page's dark panel --
// a large version of the Open Ring brand mark (see public/favicon.svg),
// ringed by eight small dots standing in for seated guests. Replaces the
// previous abstract "network of nodes" motif, which used generic dots and
// glow blobs that predated the brand refresh and didn't tie back to the
// logo at all.
const SEAT_DOTS: { x: number; y: number; accent: "violet" | "coral" }[] = [
  { x: 335, y: 210, accent: "violet" },
  { x: 298.4, y: 298.4, accent: "coral" },
  { x: 210, y: 335, accent: "violet" },
  { x: 121.6, y: 298.4, accent: "coral" },
  { x: 85, y: 210, accent: "violet" },
  { x: 121.6, y: 121.6, accent: "coral" },
  { x: 210, y: 85, accent: "violet" },
  { x: 298.4, y: 121.6, accent: "coral" },
];

export function NetworkIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 420" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="210" cy="210" r="110" stroke="#9D3FFF" strokeOpacity="0.18" />
      <circle cx="210" cy="210" r="140" stroke="#9D3FFF" strokeOpacity="0.1" />
      {SEAT_DOTS.map((dot, i) => (
        <circle key={i} cx={dot.x} cy={dot.y} r="5" fill={dot.accent === "violet" ? "#9D3FFF" : "#FF5C3D"} />
      ))}
      <g transform="translate(60,60) scale(1.5)">
        <path d="M154.5,119.8 A58,58 0 1,1 154.5,80.2" fill="none" stroke="#9D3FFF" strokeWidth="26" strokeLinecap="round" />
        <rect x="116" y="88" width="40" height="24" rx="12" fill="#9D3FFF" />
        <circle cx="172" cy="100" r="7" fill="#FF5C3D" />
      </g>
    </svg>
  );
}
