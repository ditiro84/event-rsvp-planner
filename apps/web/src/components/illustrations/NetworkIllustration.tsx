// Abstract "floor plan as network" illustration for the auth screens' brand
// panel, matching the Figma login-desktop mockup: three concentric rings, a
// glowing center "Stage" pill, a faint crosshair, and small nodes at
// varying distances standing in for tables/seats. Built as plain SVG
// (rather than pulling the mockup's individually-exported ring/dot assets)
// since every shape here is a flat-fill primitive with no photographic
// detail -- redrawing it keeps the illustration crisp at any size and free
// of the Figma CDN's ~7-day asset expiry.
export function NetworkIllustration({ className }: { className?: string }) {
  const nodesNear = [
    [-60, -60],
    [60, -60],
    [-60, 60],
    [60, 60],
  ];
  const nodesMid = [
    [-110, -40],
    [110, -40],
    [-110, 40],
    [110, 40],
    [0, -115],
    [0, 115],
  ];
  const nodesFar = [
    [-150, -110],
    [150, -110],
    [-150, 110],
    [150, 110],
  ];

  return (
    <svg viewBox="0 0 420 420" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="stageGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7c5cff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#7c5cff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g transform="translate(210 210)">
        <circle r="190" fill="none" stroke="#7c5cff" strokeOpacity="0.15" />
        <circle r="140" fill="none" stroke="#7c5cff" strokeOpacity="0.25" />
        <circle r="90" fill="none" stroke="#7c5cff" strokeOpacity="0.4" />

        <line x1="-170" y1="0" x2="170" y2="0" stroke="#7c5cff" strokeOpacity="0.12" />
        <line x1="0" y1="-170" x2="0" y2="170" stroke="#7c5cff" strokeOpacity="0.12" />

        {nodesFar.map(([x, y], i) => (
          <circle key={`far-${i}`} cx={x} cy={y} r="3" fill="#ffffff" fillOpacity="0.5" />
        ))}
        {nodesMid.map(([x, y], i) => (
          <circle key={`mid-${i}`} cx={x} cy={y} r="5" fill="#ffffff" fillOpacity="0.6" />
        ))}
        {nodesNear.map(([x, y], i) => (
          <circle key={`near-${i}`} cx={x} cy={y} r="4" fill="#ffffff" fillOpacity="0.75" />
        ))}

        <circle r="70" fill="url(#stageGlow)" />
        <rect x="-40" y="-24" width="80" height="48" rx="24" fill="#7c5cff" fillOpacity="0.9" />
        <text
          x="0"
          y="4"
          textAnchor="middle"
          fill="#1c0d3a"
          fontSize="11"
          fontFamily="Outfit, sans-serif"
          fontWeight="700"
          letterSpacing="0.05em"
        >
          STAGE
        </text>
      </g>
    </svg>
  );
}
