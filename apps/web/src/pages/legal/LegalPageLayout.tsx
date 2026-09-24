import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { usePageMeta } from "@/hooks/usePageMeta";

// Shared shell for /privacy and /terms -- kept separate from
// ArticleDetailPage's layout (which it otherwise mirrors) because these two
// pages carry a placeholder-content notice that a blog post never would.
export function LegalPageLayout({
  title,
  lastUpdated,
  path,
  children,
}: {
  title: string;
  lastUpdated: string;
  path: string;
  children: ReactNode;
}) {
  usePageMeta({ title: `${title} - Gadaova`, path });

  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" />
          Back to Gadaova
        </Link>

        {/* Placeholder-content notice -- this page's section headers reflect
            what Gadaova actually does (guest data collected, third-party
            payment processors, cookies, etc.), but the wording under each
            one is a draft starting point, not reviewed legal text. Kept
            visible (not a code comment) so anyone reading the live page --
            not just whoever edits this file -- knows not to rely on it as
            binding until a lawyer has signed off and this notice is
            removed. */}
        <div className="mb-10 flex items-start gap-3 rounded-xl2 border border-warning-200 bg-warning-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-600" />
          <p className="text-sm text-warning-800">
            <strong>Draft, not final.</strong> This page is a starting point covering the topics a policy like this
            usually needs -- it hasn't been reviewed by a lawyer and shouldn't be relied on as Gadaova&rsquo;s actual{" "}
            {title.toLowerCase()} until it has.
          </p>
        </div>

        <h1 className="font-display text-3xl font-bold text-slate-950 sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: {lastUpdated}</p>

        <div className="prose-legal mt-8 space-y-8">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-slate-950">{heading}</h2>
      <div className="mt-2.5 space-y-3 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}
