"use client";

import { useState } from "react";
import { RefreshCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  appDialogMutedOutlineButtonClassName,
  appPrimaryButtonClassName,
  appToolbarControlClassName,
} from "@/lib/button-styles";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { useMacroStats } from "./filters/useMacroStats";
import { DietarySection } from "./filters/DietarySection";
import { RatingSection } from "./filters/RatingSection";
import { MScaleSection } from "./filters/MScaleSection";
import { MacroSection } from "./filters/MacroSection";
import { AvoidSection } from "./filters/AvoidSection";
import { usePreferences } from "@/hooks/use-preferences";
import { avoidCount, NO_AVOID, type AvoidPrefs } from "@/lib/avoid";
import { FilterState, INITIAL_FILTERS } from "./filters/types";
import { Item } from "@/types/dining";

interface FilterDialogProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  items: Item[];
  activeCount: number;
  resultCount: number;
}

export function FilterDialog({
  filters,
  setFilters,
  items,
  activeCount,
  resultCount,
}: FilterDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);
  // Avoid choices are saved preferences (profile or guest storage), not page state.
  const { preferences, updatePreferences } = usePreferences();
  const savedAvoid = preferences.avoid_ingredients ?? NO_AVOID;
  const [tempAvoid, setTempAvoid] = useState<AvoidPrefs>(savedAvoid);

  // Custom hook handles the heavy math and auto-updates
  const { stats, maxes } = useMacroStats(items, setFilters);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setTempFilters(filters);
      setTempAvoid(savedAvoid);
    }
    setIsOpen(next);
  };

  const applyFilters = () => {
    setFilters(tempFilters);
    if (JSON.stringify(tempAvoid) !== JSON.stringify(savedAvoid)) {
      void updatePreferences({ avoid_ingredients: tempAvoid });
    }
    setIsOpen(false);
  };

  const updateMacro = (key: keyof typeof tempFilters.macros, val: number[]) => {
    setTempFilters((prev) => ({
      ...prev,
      macros: { ...prev.macros, [key]: val as [number, number] },
    }));
  };

  const toggleDietary = (tag: string) => {
    const current = tempFilters.dietary;
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    setTempFilters({ ...tempFilters, dietary: next });
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange}>
      <ResponsiveDialogTrigger asChild>
        <Button
          variant="outline"
          aria-label="Filters"
          className={appToolbarControlClassName(activeCount + avoidCount(savedAvoid) > 0)}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden md:inline">Filters</span>
          {activeCount + avoidCount(savedAvoid) > 0 && (
            <span className="bg-maize text-umich-blue text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full absolute -top-1 -right-1 md:static md:top-auto md:right-auto md:w-5 md:h-5 md:ml-1">
              {activeCount + avoidCount(savedAvoid)}
            </span>
          )}
        </Button>
      </ResponsiveDialogTrigger>

      <ResponsiveDialogContent>
        <ResponsiveDialogHeader className="border-b border-border">
          <ResponsiveDialogTitle className="pr-8">Menu Filters</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-8">
          <DietarySection
            selected={tempFilters.dietary}
            onChange={toggleDietary}
          />
          <AvoidSection value={tempAvoid} onChange={setTempAvoid} />
          <RatingSection
            minRating={tempFilters.minRating}
            onChange={(r) => setTempFilters({ ...tempFilters, minRating: r })}
          />
          <MScaleSection
            value={tempFilters.minMScale}
            onChange={(v) => setTempFilters({ ...tempFilters, minMScale: v })}
          />
          <MacroSection
            macros={tempFilters.macros}
            stats={stats}
            maxes={maxes}
            onChange={updateMacro}
          />
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter className="flex-row items-center justify-between gap-4 sm:justify-between sm:space-x-0">
          <Button
            variant="outline"
            onClick={() => {
              const reset = {
                ...INITIAL_FILTERS,
                macros: {
                  ...INITIAL_FILTERS.macros,
                  calories: [0, maxes.calories] as [number, number],
                  protein: [0, maxes.protein] as [number, number],
                  carbs: [0, maxes.carbs] as [number, number],
                  fat: [0, maxes.fat] as [number, number],
                },
                search: filters.search,
              };
              setTempFilters(reset);
              setFilters(reset);
            }}
            className={cn("gap-2", appDialogMutedOutlineButtonClassName)}
          >
            Reset <RefreshCcw />{" "}
          </Button>
          <Button
            onClick={applyFilters}
            className={cn("gap-2 px-8", appPrimaryButtonClassName)}
          >
            {/* The count reflects saved Avoid choices; after changing them, just apply. */}
            {JSON.stringify(tempAvoid) !== JSON.stringify(savedAvoid) ? "Apply" : `Show ${resultCount} items`}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
