// Original geometric illustration built directly in SVG -- no external
// image asset, so it's crisp at any size and ships as part of the bundle
// rather than a network request. Reuses the same brand/coral duotone
// tokens as the rest of the redesigned marketing pages (see
// tailwind.config.js) rather than inventing a separate illustration
// palette, so it reads as part of the same product rather than stock art
// bolted on top.
export function HeroIllustration() {
  return (
    <svg viewBox="0 0 480 420" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-auto w-full max-w-md" aria-hidden="true">
      <circle cx="240" cy="210" r="190" fill="#F4F1FF" />

      {/* confetti */}
      <circle cx="80" cy="80" r="7" fill="#E87A50" />
      <circle cx="405" cy="100" r="5" fill="#633BFE" />
      <rect x="55" y="300" width="12" height="12" rx="3" fill="#7C5CFF" transform="rotate(18 61 306)" />
      <rect x="400" y="290" width="10" height="10" rx="3" fill="#D85A30" transform="rotate(-12 405 295)" />
      <circle cx="60" cy="200" r="4" fill="#D85A30" />
      <circle cx="420" cy="200" r="6" fill="#BFABFF" />

      {/* calendar card, tucked behind the ticket */}
      <g transform="translate(120 70) rotate(-8)">
        <rect width="190" height="190" rx="20" fill="#FFFFFF" stroke="#E8E6ED" strokeWidth="1.5" />
        <rect width="190" height="46" rx="20" fill="#633BFE" />
        <rect y="26" width="190" height="20" fill="#633BFE" />
        <circle cx="40" cy="23" r="5" fill="#FFFFFF" />
        <circle cx="150" cy="23" r="5" fill="#FFFFFF" />
        {[0, 1, 2].map((row) =>
          [0, 1, 2, 3].map((col) => (
            <rect
              key={`${row}-${col}`}
              x={26 + col * 38}
              y={78 + row * 34}
              width="22"
              height="22"
              rx="6"
              fill={row === 1 && col === 2 ? "#D85A30" : "#F1EFF9"}
            />
          ))
        )}
      </g>

      {/* ticket, main focal shape */}
      <g transform="translate(150 150) rotate(6)">
        <path
          d="M20 0H180C191 0 200 9 200 20V60C189 60 180 69 180 80C180 91 189 100 200 100V140C200 151 191 160 180 160H20C9 160 0 151 0 140V100C11 100 20 91 20 80C20 69 11 60 0 60V20C0 9 9 0 20 0Z"
          fill="#FFFFFF"
          stroke="#E8E6ED"
          strokeWidth="1.5"
        />
        <line x1="60" y1="14" x2="60" y2="146" stroke="#E8E6ED" strokeWidth="1.5" strokeDasharray="4 6" />
        <circle cx="35" cy="80" r="18" fill="#FAECE7" />
        <path d="M28 80l5 5 10-11" stroke="#D85A30" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x="90" y="40" width="90" height="10" rx="5" fill="#EBE5FF" />
        <rect x="90" y="60" width="65" height="8" rx="4" fill="#F1EFF9" />
        <rect x="90" y="110" width="50" height="14" rx="7" fill="#633BFE" />
        <rect x="150" y="110" width="30" height="14" rx="7" fill="#D85A30" />
      </g>

      {/* guest avatars */}
      <g transform="translate(70 260)">
        <circle cx="18" cy="18" r="18" fill="#BFABFF" />
        <circle cx="52" cy="18" r="18" fill="#F0997B" />
        <circle cx="86" cy="18" r="18" fill="#9D7FFF" />
        <circle cx="18" cy="18" r="18" fill="none" stroke="#F4F1FF" strokeWidth="3" />
        <circle cx="52" cy="18" r="18" fill="none" stroke="#F4F1FF" strokeWidth="3" />
      </g>
    </svg>
  );
}

// A smaller companion mark used next to the payments callout -- a stack of
// coins/cards evoking "getting paid" without leaning on any single
// processor's actual logo.
export function PaymentsIllustration() {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-auto w-full max-w-[180px]" aria-hidden="true">
      <rect x="20" y="90" width="140" height="90" rx="16" fill="#F4F1FF" />
      <rect x="40" y="60" width="140" height="90" rx="16" fill="#FFFFFF" stroke="#E8E6ED" strokeWidth="1.5" />
      <rect x="40" y="60" width="140" height="26" rx="16" fill="#633BFE" />
      <rect x="56" y="106" width="60" height="10" rx="5" fill="#F1EFF9" />
      <rect x="56" y="124" width="40" height="8" rx="4" fill="#F1EFF9" />
      <circle cx="152" cy="120" r="18" fill="#FAECE7" />
      <text x="152" y="126" textAnchor="middle" fontSize="16" fontWeight="700" fill="#D85A30" fontFamily="sans-serif">
        $
      </text>
      <circle cx="35" cy="40" r="14" fill="#FAECE7" />
      <text x="35" y="45" textAnchor="middle" fontSize="13" fontWeight="700" fill="#D85A30" fontFamily="sans-serif">
        £
      </text>
      <circle cx="175" cy="35" r="12" fill="#EBE5FF" />
      <text x="175" y="39.5" textAnchor="middle" fontSize="11" fontWeight="700" fill="#633BFE" fontFamily="sans-serif">
        ₦
      </text>
    </svg>
  );
}
