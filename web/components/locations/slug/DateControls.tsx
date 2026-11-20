"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, formatRelative } from "date-fns";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { PopoverTrigger } from "@/components/ui/popover";
import { PopoverContent } from "@/components/ui/popover";
import { Popover } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateSelector } from "./DateSelector";
import { cn } from "@/lib/utils";
import {
  appPrimaryButtonClassName,
  appToolbarControlClassName,
  appToolbarIconControlClassName,
} from "@/lib/button-styles";

interface DateControlsProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  availableDates?: string[];
  loading?: boolean;
}

export function DateControls({
  selectedDate,
  onDateChange,
  availableDates,
  loading = false,
}: DateControlsProps) {
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [tempDate, setTempDate] = useState(selectedDate);

  // Sync tempDate when dialog opens
  useEffect(() => {
    if (isDateDialogOpen) {
      setTempDate(selectedDate);
    }
  }, [isDateDialogOpen, selectedDate]);

  // Close dialog when loading finishes (transition from true -> false)
  // We need a ref to track previous loading state or just rely on 'loading' being false and dialog open?
  // Actually, if we just check !loading && isDateDialogOpen, it might close immediately if loading hasn't started yet.
  // So we only close if we were waiting.
  // Simple approach: When "Done" is clicked, we set a flag 'isSubmitting'.
  // If 'isSubmitting' is true and 'loading' becomes false, then close.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const prevLoading = useRef(loading);

  useEffect(() => {
    if (prevLoading.current && !loading && isSubmitting) {
      setIsDateDialogOpen(false);
      setIsSubmitting(false);
    }
    prevLoading.current = loading;
  }, [loading, isSubmitting]);

  // Parse selectedDate string to Date object for Calendar
  const parsedDate = useMemo(() => {
    return new Date(selectedDate + "T12:00:00");
  }, [selectedDate]);

  const handleDone = () => {
    if (tempDate !== selectedDate) {
      setIsSubmitting(true);
      onDateChange(tempDate);
    } else {
      setIsDateDialogOpen(false);
    }
  };

  const isToday = useMemo(() => {
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/New_York",
    });
    return selectedDate === today;
  }, [selectedDate]);

  const isDateUnavailable = (date: Date) => {
      if (!availableDates || availableDates.length === 0) return false;
      const dateStr = format(date, "yyyy-MM-dd");
      return !availableDates.includes(dateStr);
  };

  return (
    <div className="shrink-0 relative">
      <div className="md:hidden">
        <ResponsiveDialog open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
          <ResponsiveDialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label={`Choose date (selected ${selectedDate})`}
              className={appToolbarIconControlClassName(
                isDateDialogOpen || !isToday,
              )}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <CalendarIcon className="w-4 h-4" />
              )}
            </Button>
          </ResponsiveDialogTrigger>
          <ResponsiveDialogContent>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Select Date</ResponsiveDialogTitle>
            </ResponsiveDialogHeader>
            <ResponsiveDialogBody>
              <div data-vaul-no-drag>
                <DateSelector
                  value={tempDate}
                  onChange={setTempDate}
                  availableDates={availableDates}
                />
              </div>
            </ResponsiveDialogBody>
            <ResponsiveDialogFooter>
              <Button
                className={cn("w-full", appPrimaryButtonClassName)}
                onClick={handleDone}
                disabled={loading}
              >
                Done
              </Button>
            </ResponsiveDialogFooter>
            {loading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <span className="animate-pulse font-semibold text-foreground">
                  Loading Menu...
                </span>
              </div>
            )}
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      </div>

      {/* Desktop Picker */}
      <div className="hidden md:block relative bg-none">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              aria-label={`Choose date (selected ${selectedDate})`}
              className={appToolbarControlClassName(false)}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CalendarIcon className="h-4 w-4" />
              )}

              {(() => {
                  const todayEST = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
                  const todayDate = new Date(todayEST + "T12:00:00");

                  let relative = formatRelative(parsedDate, todayDate).split(' at ')[0];

                  relative = relative.charAt(0).toUpperCase() + relative.slice(1);
                  if (relative.includes('/')) {
                      return format(parsedDate, "EEE, MMM do");
                  }

                  return relative;
              })()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 rounded-xl border" align="start">
            <Calendar
              mode="single"
              selected={parsedDate}
              onSelect={(d) => d && onDateChange(format(d, "yyyy-MM-dd"))}
              disabled={isDateUnavailable}
              defaultMonth={parsedDate}
              className="bg-background border-none rounded-xl"
              classNames={{
                selected: "!bg-maize !text-umich-blue hover:!bg-maize hover:text-umich-blue focus:bg-maize focus:text-umich-blue font-bold rounded-full",
                today: "bg-muted text-foreground font-bold rounded-full",
                day: "rounded-full hover:bg-muted data-[selected=true]:rounded-full",
                chevron: "text-foreground hover:text-primary"
              }}

            />
          </PopoverContent>
        </Popover>

      </div>
    </div>
  );
}
