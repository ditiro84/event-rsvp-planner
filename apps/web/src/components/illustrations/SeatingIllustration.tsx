// A tasteful, abstract representation of a seating chart -- round tables
// with seats arranged around them -- used on the auth screens' brand panel.
// Deliberately not a literal illustration of people/venues, just enough
// geometric language to say "this is an event-planning product" without
// competing with the login form for attention.
export function SeatingIllustration({ className }: { className?: string }) {
  const tables = [
    { cx: 120, cy: 110, r: 34, seats: 8 },
    { cx: 300, cy: 70, r: 26, seats: 6 },
    { cx: 330, cy: 230, r: 30, seats: 7 },
    { cx: 90, cy: 260, r: 22, seats: 5 },
  ];

  return (
    <svg viewBox="0 0 420 320" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="120" cy="110" r="130" fill="white" fillOpacity="0.06" />
      <circle cx="320" cy="240" r="90" fill="white" fillOpacity="0.05" />

      {tables.map((t, i) => (
        <g key={i}>
          <circle cx={t.cx} cy={t.cy} r={t.r} fill="white" fillOpacity="0.14" stroke="white" strokeOpacity="0.35" />
          {Array.from({ length: t.seats }).map((_, s) => {
            const angle = (s / t.seats) * Math.PI * 2;
            const sx = t.cx + Math.cos(angle) * (t.r + 16);
            const sy = t.cy + Math.sin(angle) * (t.r + 16);
            return <circle key={s} cx={sx} cy={sy} r={4.5} fill="white" fillOpacity="0.55" />;
          })}
        </g>
      ))}

      <path
        d="M60 40 C 140 10, 260 10, 340 40"
        stroke="white"
        strokeOpacity="0.25"
        strokeWidth="1.5"
        strokeDasharray="2 8"
        strokeLinecap="round"
      />
      <path
        d="M40 300 C 140 330, 300 330, 390 290"
        stroke="white"
        strokeOpacity="0.2"
        strokeWidth="1.5"
        strokeDasharray="2 8"
        strokeLinecap="round"
      />
    </svg>
  );
}
