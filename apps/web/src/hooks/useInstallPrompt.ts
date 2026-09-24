import { useEffect, useState } from "react";

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

// Shared "can this visitor install Gadaova to their home screen right now"
// state. Deliberately does NOT show anything on its own -- it used to power
// a global floating banner that popped up uninvited on every page until
// dismissed, which users found intrusive. Callers now decide where and how
// to surface install as a normal, opt-in button (see InstallAppButton).
export function useInstallPrompt() {
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

  return {
    // True once the app is already running standalone (installed) -- callers
    // should render nothing in this case, there's nothing left to offer.
    installed,
    // True on Chromium/Android once the browser has fired `beforeinstallprompt`
    // -- only then can `promptInstall()` actually show the native dialog.
    canPromptInstall: !!deferredPrompt,
    // iOS Safari never fires `beforeinstallprompt` at all, so it needs its
    // own manual "tap Share > Add to Home Screen" instructions instead.
    isIos: isIos(),
    promptInstall,
  };
}
