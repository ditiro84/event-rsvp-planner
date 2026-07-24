import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/hooks/useNotifications";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { NotificationRecord } from "@/types";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const navigate = useNavigate();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  function handleSelect(notification: NotificationRecord) {
    if (!notification.read) markRead.mutate(notification.id);
    setOpen(false);
    if (notification.link) navigate(notification.link);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-danger-500" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl2 border border-slate-100 bg-white shadow-elevated">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-400">You&rsquo;re all caught up.</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleSelect(n)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 border-b border-slate-50 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50",
                      !n.read && "bg-brand-50/40"
                    )}
                  >
                    <span className="flex items-start gap-2">
                      {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />}
                      <span className={cn("text-sm text-slate-900", n.read && "text-slate-600")}>{n.title}</span>
                    </span>
                    <span className="pl-3.5 text-xs text-slate-400">{formatRelativeTime(n.createdAt)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
