import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </span>
          <span className="font-display text-sm font-bold text-slate-950">EventFlow</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-600">
          <Link to="/articles" className="hover:text-brand-600">
            Articles
          </Link>
          <Link to="/login" className="hover:text-brand-600">
            Log In
          </Link>
          <Link to="/register" className="hover:text-brand-600">
            Sign Up
          </Link>
        </div>
        <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} EventFlow. All rights reserved.</p>
      </div>
    </footer>
  );
}
