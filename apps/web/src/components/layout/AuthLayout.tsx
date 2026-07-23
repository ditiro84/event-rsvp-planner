import type { ReactNode } from "react";
import { PartyPopper } from "lucide-react";
import { SeatingIllustration } from "@/components/illustrations/SeatingIllustration";

// Shared two-column shell for the login and register screens: a branded
// left panel on desktop (hidden on mobile, where it would just push the
// form below the fold) and a focused form area on the right. Keeping this
// as one component means both auth screens automatically stay visually
// identical as the brand evolves, instead of drifting apart.
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <div className="relative hidden w-[44%] max-w-lg flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 px-10 py-12 text-white lg:flex">
        <div className="flex items-center gap-2">
          <PartyPopper className="h-6 w-6" />
          <span className="font-display text-xl font-semibold">EventFlow</span>
        </div>

        <div>
          <p className="font-display text-3xl font-medium leading-tight text-white">
            Plan beautifully.
            <br />
            Seat confidently.
            <br />
            Celebrate effortlessly.
          </p>
          <p className="mt-4 max-w-xs text-sm text-brand-100">
            One connected workspace for guest lists, RSVPs, seating charts and event-day check-in.
          </p>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 opacity-90">
          <SeatingIllustration className="h-full w-full" />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
