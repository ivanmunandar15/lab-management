"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { CameraOff, FlashlightOff, Flashlight, RefreshCw, SwitchCamera } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Kamera hanya jalan di browser. Dimuat dinamis agar tidak ikut SSR.
const Scanner = dynamic(() => import("@yudiel/react-qr-scanner").then((m) => m.Scanner), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-neutral-900" aria-hidden="true" />,
});

type Facing = "environment" | "user";

interface Props {
  /** Dipanggil untuk setiap QR yang terbaca. Pemanggil bertanggung jawab atas debounce. */
  onDetect: (text: string) => void;
  paused?: boolean;
  /** Dipanggil jika kamera tidak bisa dipakai (izin ditolak, tidak ada kamera, bukan HTTPS). */
  onCameraUnavailable?: () => void;
  hint?: string;
  className?: string;
}

function describeCameraError(err: unknown): string {
  const name = err instanceof Error ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser, lalu coba lagi.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "Kamera tidak ditemukan di perangkat ini.";
  if (name === "NotReadableError") return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.";
  return "Kamera tidak dapat dibuka.";
}

type TorchTrack = MediaStreamTrack & { getCapabilities?: () => MediaTrackCapabilities & { torch?: boolean } };

/** Tampilan kamera dengan bingkai pemindai, senter, dan ganti kamera. */
export function QrScannerView({ onDetect, paused, onCameraUnavailable, hint = "Arahkan kamera ke QR pada alat", className }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [facing, setFacing] = useState<Facing>("environment");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const unavailableRef = useRef(onCameraUnavailable);
  unavailableRef.current = onCameraUnavailable;

  const insecure = typeof window !== "undefined" && (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia);
  useEffect(() => {
    if (insecure) {
      setError("Kamera hanya bisa dipakai lewat HTTPS atau localhost. Gunakan input kode manual di bawah.");
      unavailableRef.current?.();
    }
  }, [insecure]);

  const getTrack = useCallback((): TorchTrack | null => {
    const video = wrapRef.current?.querySelector("video");
    const stream = video?.srcObject;
    return stream instanceof MediaStream ? (stream.getVideoTracks()[0] as TorchTrack | undefined) ?? null : null;
  }, []);

  // Deteksi dukungan senter setelah stream kamera aktif.
  useEffect(() => {
    if (error) return;
    setTorchOn(false);
    setTorchSupported(false);
    const timer = setInterval(() => {
      const track = getTrack();
      if (!track) return;
      setTorchSupported(!!track.getCapabilities?.().torch);
      clearInterval(timer);
    }, 600);
    return () => clearInterval(timer);
  }, [facing, attempt, error, getTrack]);

  async function toggleTorch() {
    const track = getTrack();
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] as unknown as MediaTrackConstraintSet[] });
      setTorchOn(next);
    } catch {
      toast.error("Senter tidak dapat dinyalakan di perangkat ini");
    }
  }

  function handleError(err: unknown) {
    setError(describeCameraError(err));
    unavailableRef.current?.();
  }

  return (
    <div ref={wrapRef} className={cn("relative isolate size-full overflow-hidden bg-black", className)}>
      {!error && (
        <Scanner
          key={`${facing}-${attempt}`}
          onScan={(codes: { rawValue: string }[]) => {
            const raw = codes[0]?.rawValue;
            if (raw) onDetect(raw);
          }}
          onError={handleError}
          paused={paused}
          formats={["qr_code"]}
          constraints={{ facingMode: { ideal: facing } }}
          components={{ audio: false, finder: false }}
          styles={{ container: { width: "100%", height: "100%" }, video: { objectFit: "cover" } }}
        />
      )}

      {error ? (
        <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-neutral-950 px-8 text-center text-white">
          <span className="flex size-14 items-center justify-center rounded-full bg-white/10"><CameraOff className="size-7" aria-hidden="true" /></span>
          <p className="max-w-xs text-sm leading-relaxed">{error}</p>
          {!insecure && (
            <Button variant="secondary" onClick={() => { setError(null); setAttempt((a) => a + 1); }}>
              <RefreshCw /> Coba lagi
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Bingkai pemindai: sisi luar digelapkan lewat box-shadow. */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <div className="relative aspect-square w-[68%] max-w-[320px] rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
              {["left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl"].map((c) => (
                <span key={c} className={cn("absolute size-9 border-white", c)} />
              ))}
              <span className="absolute inset-x-3 top-[6%] h-0.5 animate-scan rounded-full bg-primary shadow-[0_0_12px_2px_hsl(var(--primary))] motion-reduce:animate-none" />
            </div>
          </div>

          <p aria-live="polite" className="pointer-events-none absolute inset-x-0 top-4 mx-auto w-fit max-w-[80%] rounded-full bg-black/60 px-4 py-1.5 text-center text-sm font-medium text-white backdrop-blur">
            {hint}
          </p>

          <div className="absolute right-3 top-14 flex flex-col gap-2">
            <Button
              type="button" size="icon" variant="secondary" disabled={!torchSupported}
              className="size-12 rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-40"
              aria-label={torchSupported ? (torchOn ? "Matikan senter" : "Nyalakan senter") : "Senter tidak didukung perangkat ini"}
              aria-pressed={torchOn}
              onClick={toggleTorch}
            >
              {torchOn ? <Flashlight className="!size-5 text-yellow-300" /> : <FlashlightOff className="!size-5" />}
            </Button>
            <Button
              type="button" size="icon" variant="secondary"
              className="size-12 rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label={facing === "environment" ? "Ganti ke kamera depan" : "Ganti ke kamera belakang"}
              onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
            >
              <SwitchCamera className="!size-5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
