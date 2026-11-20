"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { EyeOff, Star, Trash2, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminDeleteReview } from "@/app/actions/admin";
import type { AdminReview } from "@/lib/admin/data";
import { getItemPhotoPublicUrl } from "@/lib/item-photos";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

function when(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "";
}

/** Reviews as admins see them: real author even when posted anonymously. */
export function AdminReviewList({ reviews, showAuthor = true }: { reviews: AdminReview[]; showAuthor?: boolean }) {
  const [rows, setRows] = useState(reviews);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No reviews.</p>;

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {rows.map((r) => (
        <li key={r.id} className="space-y-2 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {r.hallSlug ? (
                  <Link href={`/locations/${r.hallSlug}?item=${r.itemId}`} className="font-semibold hover:underline">
                    {r.itemName}
                  </Link>
                ) : (
                  <span className="font-semibold">{r.itemName}</span>
                )}
                <span className="flex items-center gap-0.5" aria-label={`${r.rating} of 5`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className={cn("h-3.5 w-3.5", i < r.rating ? "fill-maize text-maize" : "text-muted-foreground/30")} />
                  ))}
                </span>
                {r.isAnonymous ? (
                  <Badge variant="warning" shape="pill" className="gap-1">
                    <EyeOff className="h-3 w-3" /> Anonymous
                  </Badge>
                ) : null}
                {!r.userId ? (
                  <Badge variant="muted" shape="pill" className="gap-1">
                    <UserX className="h-3 w-3" /> Deleted account
                  </Badge>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {r.hallName ?? "Unknown location"} · {when(r.createdAt)}
                {r.editedAt ? " · edited" : ""}
              </p>
              {showAuthor && r.userId ? (
                <p className="mt-1 text-xs">
                  By{" "}
                  <Link href={`/admin/users/${r.userId}`} className="font-medium text-primary hover:underline">
                    {r.authorName ?? "Unnamed"}
                  </Link>
                  {r.authorEmail ? <span className="text-muted-foreground"> · {r.authorEmail}</span> : null}
                </p>
              ) : null}
            </div>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              className="text-red-600 hover:bg-destructive/10 hover:text-red-700"
              onClick={() => {
                if (confirming !== r.id) {
                  setConfirming(r.id);
                  return;
                }
                startTransition(async () => {
                  const res = await adminDeleteReview(r.id);
                  if (!res.success) {
                    toast.error(res.error);
                    return;
                  }
                  setRows((prev) => prev.filter((x) => x.id !== r.id));
                  setConfirming(null);
                  toast.success("Review deleted.");
                });
              }}
            >
              <Trash2 className="h-4 w-4" />
              {confirming === r.id ? "Confirm delete" : "Delete"}
            </Button>
          </div>
          {r.comment ? <p className="whitespace-pre-wrap text-sm">{r.comment}</p> : null}
          {r.photos.length ? (
            <div className="flex flex-wrap gap-2">
              {r.photos.map((p) => (
                <a
                  key={p.id}
                  href={getItemPhotoPublicUrl(p.storagePath) ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="relative block h-16 w-16 overflow-hidden rounded-md border border-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={getItemPhotoPublicUrl(p.storagePath) ?? ""} alt="" className="h-full w-full object-cover" />
                  {p.isApproved !== true ? (
                    <span className="absolute inset-x-0 bottom-0 bg-black/60 text-center text-[10px] text-white">pending</span>
                  ) : null}
                </a>
              ))}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
