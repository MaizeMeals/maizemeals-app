import { Flame, Dumbbell, Wheat } from "lucide-react";
import { DualRangeSlider } from "@/components/ui/dual-slider";
import { MacroHistogram } from "../MacroHistogram";

interface MacroSliderProps {
  label: string;
  icon: React.ElementType;
  // Change prop names to be specific classes
  textColor: string;
  fillColor: string;
  bgColor: string;
  data: number[];
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (val: number[]) => void;
  unit?: string;
}

function MacroSlider({
  label,
  icon: Icon,
  textColor,
  fillColor,
  bgColor,
  data,
  min,
  max,
  step,
  value,
  onChange,
  unit = "",
}: MacroSliderProps) {
  return (
    <div className="w-full">
      {/* Label Header */}
      <div className="flex justify-between text-xs mb-1 px-1">
        <span className={`font-medium ${textColor} flex items-center gap-1.5`}>
          <Icon className={`w-3.5 h-3.5 ${textColor}`} />
          {label}
        </span>
        <span className="text-muted-foreground font-mono text-[10px]">
          {value[0]} - {value[1]}
          {unit}
        </span>
      </div>

      {/* The Histogram + Slider Combo */}
      <div className="relative pt-8 h-20">
        {/* 1. Histogram (Sits on top of the track) */}
        <div className="absolute left-0 right-0 bottom-[14px] h-12 flex items-end px-[14px] z-0">
          <MacroHistogram
            data={data}
            min={min}
            max={max}
            color={fillColor}
            selectedRange={value}
            bins={20}
          />
        </div>

        {/* 2. Slider (Sits at bottom) */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <DualRangeSlider
            min={min}
            max={max}
            step={step}
            value={value}
            onValueChange={onChange}
            color={bgColor}
            minimal={true}
            className="h-7" // Matches thumb height
          />
        </div>
      </div>

      {/* Min/Max Footer Labels */}
      <div className="flex justify-between text-[10px] text-slate-300 dark:text-slate-700 px-1 -mt-1">
        <span>{min}</span>
        <span>{max}+</span>
      </div>
    </div>
  );
}

export function MacroSection({ macros, stats, maxes, onChange }: any) {
  return (
    <section>
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-6">
        Macro Targets
      </h3>
      <div className="space-y-8">
        <MacroSlider
          label="Calories"
          icon={Flame}
          // Pass FULL STRINGS here
          textColor="text-orange-500"
          fillColor="fill-orange-500"
          bgColor="bg-orange-500"
          unit=""
          data={stats.calories}
          min={0}
          max={maxes.calories}
          step={50}
          value={macros.calories}
          onChange={(val) => onChange("calories", val)}
        />
        <MacroSlider
          label="Protein"
          icon={Dumbbell}
          textColor="text-rose-500"
          fillColor="fill-rose-500"
          bgColor="bg-rose-500"
          unit="g"
          data={stats.protein}
          min={0}
          max={maxes.protein}
          step={5}
          value={macros.protein}
          onChange={(val) => onChange("protein", val)}
        />
        <MacroSlider
          label="Carbs"
          icon={Wheat}
          textColor="text-amber-500"
          fillColor="fill-amber-500"
          bgColor="bg-amber-500"
          unit="g"
          data={stats.carbs}
          min={0}
          max={maxes.carbs}
          step={5}
          value={macros.carbs}
          onChange={(val) => onChange("carbs", val)}
        />
      </div>
    </section>
  );
}
