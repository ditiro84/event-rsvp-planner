import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/ui/BrandMark";
import { Spinner } from "@/components/ui/Spinner";

// Catch-all for any unmatched URL (bad link, stale bookmark, typo) -- see
// App.tsx's path="*" route. Previously this silently redirected straight
// to login or the dashboard with no explanation; now it says what
// happened and offers a role-aware way forward, matching the smart
// redirect the old DefaultRedirect component used to do silently.
export default function NotFoundPage() {
  const { user, isLoading } = useAuth();
  const homeHref = !isLoading && user ? (user.role === "ADMIN" ? "/admin" : "/events") : "/";
  const homeLabel = !isLoading && user ? (user.role === "ADMIN" ? "Go to Admin" : "Go to my events") : "Go to homepage";

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 text-center">
      <div className="max-w-sm rounded-xl2 border border-slate-200 bg-white p-8 shadow-card">
        <BrandMark className="mx-auto h-12 w-12" />
        <h1 className="mt-4 font-display text-2xl font-bold text-slate-950">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          The link you followed may be broken, or the page may have been moved.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          {isLoading ? (
            <Spinner />
          ) : (
            <Link to={homeHref} className="w-full">
              <Button className="w-full">{homeLabel}</Button>
            </Link>
          )}
          {!isLoading && user && (
            <Link to="/" className="text-sm font-medium text-slate-500 hover:text-brand-600">
              Back to Gadaova homepage
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
