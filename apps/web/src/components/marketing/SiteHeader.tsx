import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/Button";

// Shared header for all public/marketing pages (landing page, /articles
// blog) -- kept as one component so nav/branding only needs updating once.
export function SiteHeader() {
  const { user, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <span className="font-display text-xl font-bold text-slate-950">EventFlow</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/articles" className="hidden px-3 py-2 text-sm font-medium text-slate-600 hover:text-brand-600 sm:inline-block">
            Articles
          </Link>
          {!isLoading && user ? (
            <Link to="/events">
              <Button size="md">Go to my events</Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="md">
                  Log In
                </Button>
              </Link>
              <Link to="/register">
                <Button size="md">Get Started Free</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
