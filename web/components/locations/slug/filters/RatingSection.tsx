import { Star } from "lucide-react";

export function RatingSection({
  minRating,
  onChange,
}: {
  minRating: number;
  onChange: (val: number) => void;
}) {
  return (
    <section>
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
        Minimum Rating
      </h3>
      <div className="grid grid-cols-4 gap-2 p-1">
        {[0, 3, 4, 4.5].map((rating) => (
          <button
            key={rating}
            onClick={() => onChange(rating)}
            className={`flex items-center justify-center h-8 rounded-4xl text-sm font-medium transition-all ${
              minRating === rating
                ? "border border-primary bg-primary/10 text-primary shadow-sm"
                : "border border-muted text-foreground hover:text-foreground"
            }`}
          >
            {rating === 0 ? (
              "Any"
            ) : (
              <>
                {rating}+{" "}
                <Star className="w-3 h-3 ml-1 fill-current" />
              </>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
