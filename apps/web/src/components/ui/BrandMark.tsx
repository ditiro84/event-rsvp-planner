import { cn } from "@/lib/cn";

// The app's actual brand mark (also the favicon/app-icon source) -- the
// Open Ring: a broken violet circle with a coral accent dot standing in
// for the open seat/gap, already colorful on its own so it's rendered bare
// rather than boxed in a solid colour tile. Referenced as a static asset
// (not inlined) since the same file also serves as the browser favicon.
//
// The "?v=2" query string is a manual cache-buster: browsers (and Chrome's
// separate internal favicon cache in particular) hang on to a favicon.svg
// response very aggressively, often ignoring normal cache-busting like a
// hard refresh. Bump this version whenever the mark's artwork changes so
// browsers treat it as a new resource instead of reusing old cached bytes
// -- this is what made the prior bolt-shaped mark keep appearing after the
// brand refresh shipped. Keep this in sync with the <link rel="icon"> href
// in index.html.
export function BrandMark({ className }: { className?: string }) {
  return <img src="/favicon.svg?v=2" alt="" className={cn("h-8 w-8", className)} />;
}
