import { Star } from "lucide-react";

export function ReviewsTab() {
  return (
    <div className="p-10 text-center text-muted-foreground text-sm">
       <Star className="w-8 h-8 mx-auto mb-2 opacity-20" />
       No reviews yet. <br/> Be the first to write one!
    </div>
  )
}
