"use client";

import { useState } from "react";
import { RefreshCcw, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as Dialog from "@radix-ui/react-dialog";
import { useMacroStats } from "./filters/useMacroStats";
import { DietarySection } from "./filters/DietarySection";
import { RatingSection } from "./filters/RatingSection";
import { MScaleSection } from "./filters/MScaleSection";
import { MacroSection } from "./filters/MacroSection";
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

  // Custom hook handles the heavy math and auto-updates
  const { stats, maxes } = useMacroStats(items, setFilters);

  const handleOpen = () => {
    setTempFilters(filters);
    setIsOpen(true);
  };

  const applyFilters = () => {
    setFilters(tempFilters);
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
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild onClick={handleOpen}>
        <Button
          variant="outline"
          className={`relative h-10 w-10 md:w-auto p-0 md:px-4 shrink-0 rounded-full border gap-2 ${activeCount > 0 ? "bg-maize/30 border-maize text-foreground" : ""}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden md:inline">Filters</span>
          {activeCount > 0 && (
            <span className="bg-maize text-umich-blue text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full absolute -top-1 -right-1 md:static md:top-auto md:right-auto md:w-5 md:h-5 md:ml-1">
              {activeCount}
            </span>
          )}
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 flex flex-col w-full h-full max-w-lg translate-x-[-50%] translate-y-[-50%] border bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:h-[85vh] sm:rounded-lg md:w-full overflow-hidden">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left px-6 py-4 border-b border-border shrink-0">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight flex justify-between items-center">
              <span>Menu Filters</span>
              <Dialog.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Dialog.Close>
            </Dialog.Title>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pt-6 pb-6 space-y-8">
            <DietarySection
              selected={tempFilters.dietary}
              onChange={toggleDietary}
            />
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
          </div>

          <div className="p-4 shrink-0 z-20 flex flex-row items-center justify-between gap-4 mt-auto border-t">
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
                  },
                  search: filters.search,
                };
                setTempFilters(reset);
                setFilters(reset);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              Reset <RefreshCcw />{" "}
            </Button>
            <Button onClick={applyFilters} className="font-bold px-8">
              Show {resultCount} items
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
