import type { ReactNode } from "react";
import { NetworkIllustration } from "@/components/illustrations/NetworkIllustration";
import { BrandMark } from "@/components/ui/BrandMark";

// Shared two-column shell for the login and register screens, matching the
// Figma "login-desktop" mockup: a dark violet-gradient brand panel with an
// abstract network illustration and tagline on desktop (hidden on mobile,
// where it would just push the form below the fold), and a focused white
// form area on the right.
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white">
      <div className="relative hidden w-[60%] max-w-[864px] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#1c0d3a] to-[#09031c] px-20 py-16 text-white lg:flex">
        <div className="flex items-center gap-3">
          <BrandMark className="h-9 w-9" />
          <span className="font-display text-[22px] font-extrabold text-white">Gadaova</span>
        </div>

        <div className="flex h-[440px] items-center justify-center">
          <NetworkIllustration className="h-full w-full max-w-[420px]" />
        </div>

        <div className="flex flex-col gap-4">
          {/* Each clause picks up its own colour instead of a single accent
              on the middle phrase -- a small readable echo of the app's
              wider per-tab colour system (see lib/tabTheme.ts) right at the
              entry point, rather than the previous mostly-monochrome hero. */}
          <p className="font-display text-[36px] font-medium leading-[1.25] text-white">
            <span className="text-brand-400">Plan beautifully.</span> <span className="text-[#f5a081]">Seat confidently.</span>{" "}
            <span className="text-[#5eead4]">Celebrate effortlessly.</span>
          </p>
          <p className="max-w-lg text-base leading-[1.6] text-white/70">
            Empowering modern hosts, premium venues, and experience designers with seamless floor plan structures,
            seating intelligence, and absolute control.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <div className="mb-8 flex flex-col items-center gap-2 text-brand-700 lg:hidden">
          <BrandMark className="h-9 w-9" />
          <span className="font-display text-xl font-extrabold text-slate-950">Gadaova</span>
        </div>
        <div className="w-full max-w-[448px]">{children}</div>
      </div>
    </div>
  );
}
