"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { Camera, ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CameraCapture, type CameraFailure } from "@/components/reviews/CameraCapture";

const BUTTON =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-within:ring-1 focus-within:ring-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

/**
 * "Take photo" opens a camera preview inside the sheet when the browser allows
 * it (getUserMedia), so the app never leaves the foreground. Without camera
 * access it falls back to the system camera (capture="environment").
 * "Choose photo" opens the library. The camera button only shows on touch
 * devices.
 */
export function PhotoSourceButtons({
  onChange,
  onCapture,
  disabled,
  busy,
  chooseLabel = "Choose photo",
}: {
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  /** Receives a photo taken with the in-page camera. */
  onCapture: (file: File) => void;
  disabled?: boolean;
  busy?: boolean;
  chooseLabel?: string;
}) {
  const off = disabled || busy;
  const [canStream, setCanStream] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [failure, setFailure] = useState<CameraFailure | null>(null);

  useEffect(() => {
    setCanStream(typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  if (cameraOpen) {
    return (
      <CameraCapture
        onCapture={(file) => {
          setCameraOpen(false);
          onCapture(file);
        }}
        onCancel={() => setCameraOpen(false)}
        onFailure={(reason) => {
          setCameraOpen(false);
          setFailure(reason);
        }}
      />
    );
  }

  // In-page camera when possible; after a failure, the system camera.
  const useInPageCamera = canStream && !failure;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {useInPageCamera ? (
          <button
            type="button"
            className={cn(BUTTON, "pointer-fine:hidden", off && "pointer-events-none opacity-60")}
            onClick={() => setCameraOpen(true)}
            disabled={off}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            Take photo
          </button>
        ) : (
          <label className={cn(BUTTON, "pointer-fine:hidden", off && "pointer-events-none opacity-60")}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {failure ? "Open camera app" : "Take photo"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={onChange}
              disabled={off}
            />
          </label>
        )}
        <label className={cn(BUTTON, off && "pointer-events-none opacity-60")}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {busy ? "Compressing…" : chooseLabel}
          <input type="file" accept="image/*" className="sr-only" onChange={onChange} disabled={off} />
        </label>
      </div>
      {failure ? (
        <p className="text-xs text-muted-foreground" role="status">
          {failure === "denied"
            ? "Camera access is blocked for this site. Allow it in your browser's site settings, or use your camera app. Your review is saved if the app reloads."
            : "Couldn't start the camera here. Use your camera app instead. Your review is saved if the app reloads."}
        </p>
      ) : null}
    </div>
  );
}
