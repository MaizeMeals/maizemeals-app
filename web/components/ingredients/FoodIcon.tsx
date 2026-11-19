import { foodIconSrc } from "@/lib/food-icons";
import { cn } from "@/lib/utils";

/** Illustrated icon for a dish (used where there's no photo). Decorative. */
export function FoodIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  return (
    // Static SVGs from public/: next/image adds nothing here.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={foodIconSrc(name)} alt="" aria-hidden className={cn("select-none", className)} draggable={false} />
  );
}
