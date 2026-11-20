"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type CameraFailure = "denied" | "unavailable";

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

/**
 * Live camera preview inside the page, with a shutter button. Taking the
 * photo here keeps the app in the foreground: handing off to the system
 * camera app lets Android kill the browser, which loses the review.
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
  const controlsRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

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

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setCapturing(true);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCapturing(false);
      onFailure("unavailable");
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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

  return (
    <div className="space-y-2">
      <div className="relative flex h-[min(36vh,20rem)] w-full items-center justify-center overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          onLoadedData={() => {
            setReady(true);
            controlsRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }}
          className="h-full w-full object-contain"
          aria-label="Camera preview"
        />
        {!ready ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-white/80">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            Starting camera…
          </div>
        ) : null}
      </div>
      <div ref={controlsRef} className="flex gap-2">
        <Button type="button" onClick={capture} disabled={!ready || capturing} className="flex-1 gap-2">
          {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          Take photo
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="gap-2">
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
