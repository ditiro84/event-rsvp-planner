import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

// A plain <img src="https://api.../..."> can only authenticate with a
// cookie -- it can't attach the Authorization header our axios client
// sends, and third-party cookies (the API and web app live on different
// domains) are blocked by most browsers by default. That silently 401s and
// shows a broken image icon for any auth-gated image (e.g. product photos
// in the Merchandise tab), even though the upload itself worked fine.
//
// Fetching the bytes through the authenticated `api` client and handing the
// browser a local object URL sidesteps both problems. Only needed for
// planner-facing (authenticated) images -- public guest-facing image routes
// have no auth requirement and can keep using a plain <img src>.
export function AuthedImage({
  src,
  alt,
  className,
  fallback,
}: {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let urlToRevoke: string | null = null;
    setFailed(false);
    setObjectUrl(null);

    api
      .get(src, { responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        urlToRevoke = URL.createObjectURL(res.data);
        setObjectUrl(urlToRevoke);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [src]);

  if (failed) return fallback ? <>{fallback}</> : null;
  if (!objectUrl) return <div className={cn("animate-pulse bg-slate-100", className)} />;
  return <img src={objectUrl} alt={alt} className={className} />;
}
