import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

const DISMISS_KEY = "gadaova_install_dismissed_at";
const DISMISS_SNOOZE_DAYS = 14;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's own non-standard flag -- there's no display-mode match
    // for "installed to home screen" on iOS.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function wasRecentlyDismissed() {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (Number.isNaN(dismissedAt)) return false;
  const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
  return daysSince < DISMISS_SNOOZE_DAYS;
}

// Global "install to home screen" banner -- Chrome/Edge/Android fire
// `beforeinstallprompt` and can be triggered programmatically; iOS Safari
// never fires that event at all, so those visitors get a manual "tap Share
// > Add to Home Screen" hint instead. Dismissing either variant snoozes it
// for two weeks rather than hiding it forever, since a guest today may be
// a repeat ticket buyer next month who'd still benefit from installing.
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasRecentlyDismissed()) return;

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setDeferredPrompt(null);
      setShowIosHint(false);
      localStorage.removeItem(DISMISS_KEY);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if (isIos()) {
      // No event to wait for on iOS -- just show the hint after a short
      // delay so it doesn't compete with the page's own first paint.
      const timer = setTimeout(() => setShowIosHint(true), 2000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", handleAppInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "dismissed") dismiss();
    else localStorage.removeItem(DISMISS_KEY);
  }

  if (dismissed || (!deferredPrompt && !showIosHint)) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-label="Install Gadaova"
    >
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl2 border border-slate-200 bg-white p-4 shadow-elevated">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-50 text-coral-600">
          <Download className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Install Gadaova</p>
          {deferredPrompt ? (
            <p className="text-xs text-slate-500">Add it to your home screen for quick access.</p>
          ) : (
            <p className="flex items-center gap-1 text-xs text-slate-500">
              Tap <Share className="h-3.5 w-3.5" aria-hidden="true" />, then "Add to Home Screen".
            </p>
          )}
        </div>
        {deferredPrompt && (
          <Button variant="accent" size="sm" onClick={handleInstall}>
            Install
          </Button>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
