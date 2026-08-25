import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Spinner } from "@/components/ui/Spinner";

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Spinner />;
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}

// Gates admin-only routes (e.g. /admin) on top of ProtectedRoute -- planners
// who navigate here directly (or via a stale bookmark) get bounced to their
// events list rather than seeing a broken/empty admin page. The API itself
// independently enforces this too (requireAdmin), this is just so the UI
// doesn't dead-end for a non-admin.
export function AdminRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Spinner />;
  }
  if (user?.role !== "ADMIN") {
    return <Navigate to="/events" replace />;
  }
  return <Outlet />;
}
