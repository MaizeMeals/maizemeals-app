"use client";

import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Supabase Storage bucket for item/review photos. */
const PHOTOS_BUCKET = "photos";

export function getStoragePhotoUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";
  return `${base}/storage/v1/object/public/${PHOTOS_BUCKET}/${storagePath}`;
}

export type PhotosDialogProps = {
  /** First entry should be the venue hero/front image; rest are e.g. from itemMetadata. */
  photoUrls: string[];
  venueName: string;
  /** Trigger content (e.g. the hero image block). */
  children: React.ReactNode;
};

export function PhotosDialog({ photoUrls, venueName, children }: PhotosDialogProps) {
  const hasPhotos = photoUrls.length > 0;

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm duration-300",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-full max-w-4xl h-[80vh] translate-x-[-50%] translate-y-[-50%]",
            "bg-black shadow-2xl focus:outline-none sm:rounded-xl overflow-hidden duration-300 ease-out",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <Dialog.Title className="sr-only">
            Photos: {venueName}
          </Dialog.Title>
          <div className="relative h-full w-full overflow-hidden flex flex-col">
            <Dialog.Close
              className="absolute right-4 top-4 z-50 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 focus:outline-none"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-1 p-1 h-full overflow-y-auto">
              {hasPhotos ? (
                photoUrls.map((src, i) => (
                  <div
                    key={i}
                    className="relative aspect-square bg-zinc-900 overflow-hidden"
                  >
                    <Image
                      src={src}
                      alt={`${venueName} photo ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 33vw"
                      unoptimized={src.startsWith(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")}
                    />
                  </div>
                ))
              ) : (
                <div className="col-span-full flex items-center justify-center text-zinc-500 text-sm">
                  No photos yet
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
