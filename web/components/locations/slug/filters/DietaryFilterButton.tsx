import { getDietaryConfig } from "../DietaryTags";
import { cn } from "@/lib/utils";

interface DietaryFilterButtonProps {
  id: string;
  isSelected: boolean;
  onClick: () => void;
  variant?: "default" | "small";
}

export function DietaryFilterButton({
  id,
  isSelected,
  onClick,
  variant = "default",
}: DietaryFilterButtonProps) {
  const config = getDietaryConfig(id);
  if (!config) return null;
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border transition-all",
        variant === "default" && "px-3 py-1.5 text-xs font-semibold",
        variant === "small" &&
          "px-3 py-1 text-[11px] font-bold whitespace-nowrap",
        isSelected
          ? cn(
              config.bg,
              config.border,
              config.color,
              "shadow-sm transform scale-[1.02]",
            )
          : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <Icon
        className={cn(
          "w-3.5 h-3.5",
          variant === "small" && "w-3 h-3",
          isSelected ? "text-current" : "text-muted-foreground", // text-current inherits from button's config.color
        )}
      />
      {config.label}
    </button>
  );
}
