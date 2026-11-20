"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";

export type CameraFailure = "denied" | "unavailable";

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

/**
 * Full-screen camera with a shutter button. Taking the photo here keeps the
 * app in the foreground: handing off to the system camera app lets Android
 * kill the browser, which loses the review.
 *
 * Portaled to <body> so it covers the whole screen, but still a React child
 * of the review sheet, so Radix treats taps here as inside the dialog.
 * `data-vaul-no-drag` and stopPropagation keep the sheet from dragging.
 */
export function CameraCapture({
  onCapture,
  onCancel,
  onFailure,
}: {
  onCapture: (file: File) => void;
  onCancel: () => void;
  onFailure: (reason: CameraFailure) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1440 },
        },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          void video.play().catch(() => {});
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : "";
        onFailure(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable");
      });
    return () => {
      cancelled = true;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
    // Start the camera once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setCapturing(true);
    setFlash(true);

    // Save what the preview shows: the preview is object-cover, so crop the
    // frame to the screen's aspect ratio.
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cw = video.clientWidth || vw;
    const ch = video.clientHeight || vh;
    const scale = Math.max(cw / vw, ch / vh);
    const sw = Math.min(vw, Math.round(cw / scale));
    const sh = Math.min(vh, Math.round(ch / scale));
    const sx = Math.round((vw - sw) / 2);
    const sy = Math.round((vh - sh) / 2);

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCapturing(false);
      onFailure("unavailable");
      return;
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    canvas.toBlob(
      (blob) => {
        setCapturing(false);
        if (!blob) {
          onFailure("unavailable");
          return;
        }
        stopStream(streamRef.current);
        streamRef.current = null;
        onCapture(new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  }, [onCapture, onFailure]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      data-vaul-no-drag
      role="dialog"
      aria-modal="true"
      aria-label="Camera"
      className="pointer-events-auto fixed inset-0 z-[200] flex touch-none select-none flex-col bg-black text-white"
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        onLoadedData={() => setReady(true)}
        className="absolute inset-0 h-full w-full object-cover"
        aria-label="Camera preview"
      />
      {!ready ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-white/80">
          <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
          Starting camera…
        </div>
      ) : null}
      <div
        className={`pointer-events-none absolute inset-0 bg-white transition-opacity duration-200 ${flash ? "opacity-70" : "opacity-0"}`}
        onTransitionEnd={() => setFlash(false)}
        aria-hidden
      />

      <div className="relative flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)]">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur-md active:scale-95"
          aria-label="Close camera"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="relative mt-auto flex items-center justify-center bg-gradient-to-t from-black/60 to-transparent pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-10">
        <button
          type="button"
          onClick={capture}
          disabled={!ready || capturing}
          aria-label="Take photo"
          className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/90 transition-transform active:scale-90 disabled:opacity-50"
        >
          <span className="h-[62px] w-[62px] rounded-full bg-white" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
