import { DIETARY_IDS } from "../DietaryTags";
import { DietaryFilterButton } from "./DietaryFilterButton";

export function DietarySection({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (id: string) => void;
}) {
  return (
    <section>
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
        Dietary Preferences
      </h3>
      <div className="flex flex-wrap gap-2">
        {DIETARY_IDS.map((id) => (
          <DietaryFilterButton
            key={id}
            id={id}
            isSelected={selected.includes(id)}
            onClick={() => onChange(id)}
            variant="default"
          />
        ))}
      </div>
    </section>
  );
}
