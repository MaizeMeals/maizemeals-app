"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getItemPhotoPublicUrl } from "@/lib/item-photos";

/** Public URL for an approved item photo in Storage (bucket: item-photos). */
export function getStoragePhotoUrl(storagePath: string): string {
  return getItemPhotoPublicUrl(storagePath);
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
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className={cn(
          "left-0 top-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col",
          "gap-0 rounded-none border-0 bg-black p-0 shadow-none focus:outline-none sm:rounded-none",
          "[&>button]:hidden",
        )}
      >
        <DialogTitle className="sr-only">Photos: {venueName}</DialogTitle>
        <div className="relative min-h-0 flex-1">
          <div className="grid h-full grid-cols-2 gap-1 overflow-y-auto p-1 md:grid-cols-3">
            {hasPhotos ? (
              photoUrls.map((src, i) => (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden bg-zinc-900"
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
              <div className="col-span-full flex items-center justify-center text-sm text-zinc-500">
                No photos yet
              </div>
            )}
          </div>
          <DialogClose
            className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 focus:outline-none"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
