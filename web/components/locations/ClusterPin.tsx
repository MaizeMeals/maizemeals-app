"use client";

import { cn } from "@/lib/utils";
import { LocationSummary } from "@/types/location-summary";
import { getLocationIcon } from "@/lib/dining/icons";

interface ClusterPinProps {
  mainLocation: LocationSummary;
  isSelected: boolean;
  /** When the detail panel is showing a child venue (e.g. café), its id so we can highlight that sub-pin */
  selectedChildId?: string | null;
  onChildClick?: (id: string) => void;
}

export function ClusterPin({ mainLocation, isSelected, selectedChildId, onChildClick }: ClusterPinProps) {
  const { type, isOpen, name, children } = mainLocation;
  const hasChildren = children && children.length > 0;
  const childCount = children?.length ?? 0;
  const MainIcon = getLocationIcon(type);
  /** Main pin is highlighted (maize) only when this cluster is selected and the parent is the active venue (no child selected). */
  const isMainSelected = isSelected && !selectedChildId;

  const getPinStyles = (open: boolean, selected: boolean) => {
    if (selected) return "bg-maize border-2 border-maize shadow-lg text-slate-900";
    if (open) return "bg-umich-blue border-2 border-green-500 dark:border-green-600 text-white shadow-md";
    return "bg-umich-blue border-2 border-red-500 dark:border-red-600 text-white shadow-md";
  };

  const getStemColor = (open: boolean, selected: boolean) => {
    if (selected) return "border-t-maize";
    if (open) return "border-t-green-500 dark:border-t-green-600";
    return "border-t-red-500 dark:border-t-red-600";
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Expanded: child venue pins (e.g. Café at East Quad) */}
      {hasChildren && children.map((child, index) => {
        const ChildIcon = getLocationIcon(child.type);
        const offset = (index + 1) * 56;
        const isChildSelected = selectedChildId === child.id;

        return (
          <button
            type="button"
            key={child.id}
            onClick={(e) => {
              e.stopPropagation();
              onChildClick?.(child.id);
            }}
            className={cn(
              "absolute z-0 flex flex-col items-center justify-center transition-all duration-300 ease-out",
              isSelected ? "opacity-100 pointer-events-auto translate-x-0" : "opacity-0 pointer-events-none -translate-x-2"
            )}
            style={{
              left: isSelected ? `${offset}px` : "0",
              transitionDelay: isSelected ? `${index * 40}ms` : "0ms",
            }}
            aria-label={child.name}
          >
            <div className="absolute right-full top-1/2 h-[2px] w-4 -translate-y-1/2 bg-muted-foreground/70 rounded-full" aria-hidden />
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-2 shadow-md transition-colors",
                getPinStyles(child.isOpen, isChildSelected)
              )}
            >
              <ChildIcon className={cn("w-5 h-5", isChildSelected ? "text-slate-900" : "text-white")} />
            </div>
            {isChildSelected && (
              <span className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 px-2 py-1 bg-background border border-border text-xs font-medium rounded shadow-sm whitespace-nowrap max-w-[100px] truncate">
                {child.name}
              </span>
            )}
          </button>
        );
      })}

      {/* Main pin (parent venue, e.g. Dining Hall at East Quad) — same size as sub-pins (w-10 h-10) */}
      <div
        className={cn(
          "relative z-10 flex flex-col items-center transition-transform duration-200",
          !isSelected && "hover:scale-105"
        )}
      >
        <div
          className={cn(
            "relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors duration-200",
            getPinStyles(isOpen, isMainSelected)
          )}
        >
          <MainIcon className={cn("w-5 h-5", isMainSelected ? "text-slate-900" : "text-white")} />
          {hasChildren && childCount > 0 && (
            <div
              className={cn(
                "absolute -bottom-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full border-2 text-[10px] font-bold tabular-nums ring-2 ring-background transition-all duration-300 ease-out",
                isSelected && "opacity-0 scale-0 pointer-events-none",
                !isSelected && isOpen && "bg-green-500/90 border-green-600 text-white",
                !isSelected && !isOpen && "bg-red-500/90 border-red-600 text-white"
              )}
              title={children!.map((c) => c.name).join(" + ")}
              aria-hidden
            >
              +{childCount}
            </div>
          )}
        </div>

        <div
          className={cn(
            "w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] -mt-px transition-colors duration-200",
            getStemColor(isOpen, isMainSelected)
          )}
          aria-hidden
        />

        {isSelected && isMainSelected && (
          <span className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 px-2 py-1 bg-background border border-border text-xs font-medium rounded shadow-sm whitespace-nowrap">
            {name}
          </span>
        )}
      </div>
    </div>
  );
}
