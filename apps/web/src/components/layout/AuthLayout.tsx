import type { ReactNode } from "react";
import { Share2 } from "lucide-react";
import { NetworkIllustration } from "@/components/illustrations/NetworkIllustration";

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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 shadow-[0_4px_6px_rgba(124,92,255,0.5)]">
            <Share2 className="h-[18px] w-[18px] text-white" />
          </div>
          <span className="font-display text-[22px] font-extrabold text-white">EventFlow</span>
        </div>

        <div className="flex h-[440px] items-center justify-center">
          <NetworkIllustration className="h-full w-full max-w-[420px]" />
        </div>

        <div className="flex flex-col gap-4">
          <p className="font-display text-[36px] font-medium leading-[1.25] text-white">
            Plan beautifully. <span className="text-brand-500">Seat confidently.</span> Celebrate effortlessly.
          </p>
          <p className="max-w-lg text-base leading-[1.6] text-white/70">
            Empowering modern hosts, premium venues, and experience designers with seamless floor plan structures,
            seating intelligence, and absolute control.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <div className="mb-8 flex flex-col items-center gap-2 text-brand-700 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500">
            <Share2 className="h-[18px] w-[18px] text-white" />
          </div>
          <span className="font-display text-xl font-extrabold text-slate-950">EventFlow</span>
        </div>
        <div className="w-full max-w-[448px]">{children}</div>
      </div>
    </div>
  );
}
