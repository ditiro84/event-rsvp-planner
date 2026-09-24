import { Download, Share } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

// In-page (never floating) "install to home screen" notice for logged-in
// dashboard screens -- same install-detection logic as InstallAppButton on
// the public landing page FAQ, just styled to sit inline in a tab's normal
// content flow instead of as a plain paragraph+button. Renders nothing once
// installed, and nothing at all on browsers that can neither prompt install
// nor point to the iOS manual steps (there's nothing useful to say there).
export function InstallAppNotice({ description }: { description: string }) {
  const { installed, canPromptInstall, isIos, promptInstall } = useInstallPrompt();

  if (installed || (!canPromptInstall && !isIos)) return null;

  return (
    <Card className="flex flex-col items-start gap-3 border-brand-100 bg-brand-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
          <Download className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">Install Gadaova</p>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {canPromptInstall ? (
        <Button variant="secondary" size="sm" onClick={promptInstall} className="shrink-0">
          Install
        </Button>
      ) : (
        <p className="flex shrink-0 items-center gap-1.5 text-sm text-slate-500">
          Tap <Share className="h-4 w-4" aria-hidden="true" />, then "Add to Home Screen"
        </p>
      )}
    </Card>
  );
}
