import { Link } from "react-router-dom";
import { BrandMark } from "@/components/ui/BrandMark";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <BrandMark className="h-6 w-6" />
          <span className="font-display text-sm font-bold text-slate-950">Gadaova</span>
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
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>&copy; {new Date().getFullYear()} Gadaova. All rights reserved.</span>
          <Link to="/privacy" className="hover:text-brand-600">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-brand-600">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
