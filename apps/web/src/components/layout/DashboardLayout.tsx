import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { CalendarHeart, LogOut, PartyPopper } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 sm:flex">
        <div className="flex items-center gap-2 px-2 text-brand-700">
          <PartyPopper className="h-6 w-6" />
          <span className="text-lg font-semibold">EventFlow</span>
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          <NavLink
            to="/events"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
              }`
            }
          >
            <CalendarHeart className="h-4 w-4" />
            My Events
          </NavLink>
        </nav>
        <div className="border-t border-slate-100 pt-4">
          <p className="truncate px-2 text-sm font-medium text-slate-900">{user?.name}</p>
          <p className="truncate px-2 text-xs text-slate-500">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:hidden">
          <div className="flex items-center gap-2 text-brand-700">
            <PartyPopper className="h-5 w-5" />
            <span className="font-semibold">EventFlow</span>
          </div>
          <button onClick={handleLogout} className="text-sm font-medium text-slate-600">
            Log out
          </button>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
