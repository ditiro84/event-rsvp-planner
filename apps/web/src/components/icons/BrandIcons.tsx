// Minimal inline brand marks for the "or continue with" social buttons on
// the auth screens. Kept as plain SVG (not lucide-react, which doesn't
// ship third-party brand logos) and deliberately simple/monochrome-safe.
export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 0 0 9 18Z"
      />
      <path fill="#FBBC05" d="M3.95 10.7a5.4 5.4 0 0 1 0-3.4V4.97H.94a9 9 0 0 0 0 8.06l3.01-2.33Z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .94 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}

export function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" fill="currentColor" className={className} aria-hidden="true">
      <path d="M13.15 9.53c-.02-1.86 1.52-2.75 1.59-2.8-.87-1.27-2.22-1.44-2.7-1.46-1.15-.12-2.25.68-2.83.68-.59 0-1.48-.66-2.43-.64a3.6 3.6 0 0 0-3.03 1.85c-1.3 2.26-.33 5.6.93 7.43.62.9 1.35 1.9 2.32 1.86.93-.04 1.28-.6 2.41-.6s1.45.6 2.44.58c1.01-.02 1.65-.9 2.26-1.8.71-1.04 1-2.04 1.02-2.09-.02-.01-1.96-.75-1.98-2.99v-.02Z" />
      <path d="M11.27 3.85c.5-.62.85-1.47.75-2.35-.73.03-1.63.5-2.15 1.1-.47.54-.9 1.42-.78 2.26.83.07 1.68-.42 2.18-1.01Z" />
    </svg>
  );
}
