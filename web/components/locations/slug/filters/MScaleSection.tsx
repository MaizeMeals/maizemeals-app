import { Check } from "lucide-react";
import { DualRangeSlider } from "@/components/ui/dual-slider";
import { MScaleIndicator } from "../MScaleIndicator";

interface MScaleSectionProps {
  value: number;
  onChange: (value: number) => void;
}

export function MScaleSection({ value, onChange }: MScaleSectionProps) {
  return (
    <section>
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
        Minimum Nutrition
      </h3>
      <div className="p-5 rounded-xl bg-muted/10 border border-border shadow">
        <div className="flex items-start gap-4">
          {/* Indicator (Citrus Circle) */}
          <div className="mt-1">
            <MScaleIndicator score={value} size="lg" />
          </div>

          {/* Slider Area */}
          <div className="flex-1 space-y-4">
            <DualRangeSlider
              min={1}
              max={5}
              step={1}
              value={[value]}
              onValueChange={(val) => onChange(val[0])}
              className="py-2"

            />

            {/* Visual Tick Marks */}
            <div className="flex justify-between px-1 ml-1 mr-1">
              {[1, 2, 3, 4, 5].map((num) => (
                <div key={num} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-0.5 h-1.5 rounded-full ${
                      num === value
                        ? "bg-primary"
                        : "bg-muted-foreground"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-bold ${
                      num === value
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {num}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info Text */}
        <div className="mt-4 flex gap-2 items-start text-xs text-muted-foreground bg-green-600/10 p-2.5 rounded-lg border border-green-600">
          <Check className="w-3.5 h-3.5 mt-0.5 text-green-600 shrink-0" />
          <p className="leading-relaxed">
            Moving the slider right filters for foods that are{" "}
            <strong>more nutrient dense</strong> (e.g. more fiber, whole grains,
            less sugar).
          </p>
        </div>
      </div>
    </section>
  );
}
