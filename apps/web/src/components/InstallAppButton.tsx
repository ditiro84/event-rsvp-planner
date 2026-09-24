import { Download, Share } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useInstallPrompt } from "@/lib/InstallPromptContext";

// Contextual "install to home screen" control -- lives in the landing page
// FAQ answer for "Is there a mobile app?" (see LandingPage.tsx) rather than
// as a global floating banner. The old banner popped up uninvited on every
// page and had to be dismissed each time, which users found intrusive; this
// version only appears where a visitor is already reading about the
// feature, and only when there's something it can actually do.
export function InstallAppButton() {
  const { installed, canPromptInstall, isIos, promptInstall } = useInstallPrompt();

  if (installed) return null;

  if (canPromptInstall) {
    return (
      <Button variant="secondary" size="sm" onClick={promptInstall} className="mt-3">
        <Download className="h-4 w-4" />
        Install Gadaova to your home screen
      </Button>
    );
  }

  if (isIos) {
    return (
      <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
        On iPhone or iPad: tap <Share className="h-4 w-4 shrink-0" aria-hidden="true" /> in Safari, then
        "Add to Home Screen".
      </p>
    );
  }

  return null;
}
