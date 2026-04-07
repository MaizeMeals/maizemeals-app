"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Check, X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getItemPhotoPublicUrl } from "@/lib/item-photos";
import { HEADER_HEIGHT } from "@/components/layout/constants";

type PhotoRow = {
  id: string;
  item_id: string;
  storage_path: string;
  user_id: string;
  created_at: string | null;
};

export default function AdminPhotosPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/photos");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 403) {
        setError("You don’t have access to this page.");
        setPhotos([]);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to load photos");
        setPhotos([]);
        return;
      }
      const data = await res.json();
      setPhotos(data.photos ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.push("/login");
        return;
      }
      fetchPhotos();
    });
  }, [router, fetchPhotos]);

  const handleApprove = async (id: string) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/photos/${id}/approve`, { method: "POST" });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== id));
      }
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/photos/${id}/reject`, { method: "POST" });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== id));
      }
    } finally {
      setActionId(null);
    }
  };

  if (loading && photos.length === 0) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        style={{ paddingTop: HEADER_HEIGHT }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background p-6"
      style={{ paddingTop: HEADER_HEIGHT }}
    >
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Photo moderation</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Approve or reject photos (unapproved only). Route is protected by ADMIN_USER_IDS.
        </p>

        {error && (
          <div className="flex items-center gap-2 text-destructive mb-4 p-3 rounded-lg bg-destructive/10">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!error && photos.length === 0 && !loading && (
          <p className="text-muted-foreground">No photos pending approval.</p>
        )}

        {!error && photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((photo) => {
              const url = getItemPhotoPublicUrl(photo.storage_path);
              const busy = actionId === photo.id;
              return (
                <div
                  key={photo.id}
                  className="rounded-lg border border-border bg-card overflow-hidden shadow-sm"
                >
                  <div className="aspect-square relative bg-muted">
                    {url ? (
                      <Image
                        src={url}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized={url.startsWith(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")}
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                        No preview
                      </div>
                    )}
                  </div>
                  <div className="p-2 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-1"
                      disabled={busy}
                      onClick={() => handleApprove(photo.id)}
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 gap-1"
                      disabled={busy}
                      onClick={() => handleReject(photo.id)}
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                      Reject
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
