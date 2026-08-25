import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { CameraOff } from "lucide-react";

// Camera-based QR scanner for door check-in -- draws each video frame to a
// hidden canvas and runs jsQR against the pixel data (no server round-trip
// needed to decode). Deliberately doesn't take onScan as an effect
// dependency (kept in a ref instead) so passing a fresh inline callback
// each render doesn't restart the camera stream.
export function QrScanner({ active, onScan }: { active: boolean; onScan: (rawValue: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number>();
  const onScanRef = useRef(onScan);
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setError(null);

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) {
            const now = Date.now();
            // Debounce repeated detections of the same code within 2s so
            // holding a wristband in frame doesn't fire dozens of scans.
            const last = lastScanRef.current;
            if (!last || last.value !== code.data || now - last.at > 2000) {
              lastScanRef.current = { value: code.data, at: now };
              onScanRef.current(code.data);
            }
          }
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    }

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch {
        if (!cancelled) setError("Couldn't access the camera. Check your browser's camera permission for this site.");
      }
    }

    start();

    return () => {
      cancelled = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [active]);

  if (!active) return null;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
        <CameraOff className="h-6 w-6" />
        {error}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-brand-600 bg-black">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={videoRef} className="aspect-square w-full object-cover" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />
      <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/70" />
    </div>
  );
}
