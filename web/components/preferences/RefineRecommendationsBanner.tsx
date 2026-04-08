"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const REFINE_BANNER_DISMISSED_KEY = "maize_refine_recommendations_banner_dismissed";

type RefineRecommendationsBannerProps = {
  visible: boolean;
  onRefineClick: () => void;
  onDismiss: () => void;
};

export function RefineRecommendationsBanner({
  visible,
  onRefineClick,
  onDismiss,
}: RefineRecommendationsBannerProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2.5 text-sm",
        "md:px-4",
      )}
      role="region"
      aria-label="Refine recommendations"
    >
      <p className="min-w-0 flex-1 text-foreground font-medium">
        Refine your recommendations?
      </p>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="shrink-0 font-semibold"
        onClick={onRefineClick}
      >
        Adjust
      </Button>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
