import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallPromptState {
  // True once the app is already running standalone (installed) -- callers
  // should render nothing in this case, there's nothing left to offer.
  installed: boolean;
  // True on Chromium/Android once the browser has fired `beforeinstallprompt`
  // -- only then can `promptInstall()` actually show the native dialog.
  canPromptInstall: boolean;
  // iOS Safari never fires `beforeinstallprompt` at all, so it needs its
  // own manual "tap Share > Add to Home Screen" instructions instead.
  isIos: boolean;
  promptInstall: () => Promise<void>;
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

const InstallPromptContext = createContext<InstallPromptState | null>(null);

// Captures the browser's `beforeinstallprompt` event exactly once, at app
// mount, and shares the result via context. The event fires (if at all)
// only once per page load -- if every install button/notice ran its own
// independent listener, only whichever one happened to already be mounted
// when the event fired would ever see it (in practice, always the landing
// page's FAQ button, since it's the first thing loaded; a later
// client-side navigation to the dashboard's Overview or Team tab would
// never receive the event at all, since there's no second page load to
// re-fire it). Mounting this once at the app root and reading the same
// captured state everywhere fixes that.
export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    if (installed) return;

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setDeferredPrompt(null);
      setInstalled(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [installed]);

  async function promptInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return (
    <InstallPromptContext.Provider
      value={{ installed, canPromptInstall: !!deferredPrompt, isIos: isIos(), promptInstall }}
    >
      {children}
    </InstallPromptContext.Provider>
  );
}

// Falls back to "nothing available" if ever rendered outside the provider,
// so callers can use it unconditionally without a null-check -- shouldn't
// happen in practice since the provider wraps the whole app in main.tsx.
export function useInstallPrompt(): InstallPromptState {
  const ctx = useContext(InstallPromptContext);
  if (ctx) return ctx;
  return { installed: false, canPromptInstall: false, isIos: isIos(), promptInstall: async () => {} };
}
