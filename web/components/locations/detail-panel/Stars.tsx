import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  rating: number;
}

export function Stars({ rating }: Props) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "w-3.5 h-3.5",
            star <= Math.round(rating) ? "fill-maize text-maize" : "fill-muted text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}
