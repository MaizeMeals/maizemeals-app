"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Calendar as CalendarIcon, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as Dialog from "@radix-ui/react-dialog";
import { format, formatRelative } from "date-fns";
import { PopoverTrigger } from "@/components/ui/popover";
import { PopoverContent } from "@/components/ui/popover";
import { Popover } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateSelector } from "./DateSelector";
import { cn } from "@/lib/utils";

interface DateControlsProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  availableDates: string[];
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
        <Dialog.Root open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
          <Dialog.Trigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={`h-10 w-10 shrink-0 rounded-full border ${(isDateDialogOpen || !isToday) ? "bg-maize/30 border-maize text-foreground" : ""}`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <CalendarIcon className="w-4 h-4" />
              )}
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-sm translate-x-[-50%] translate-y-[-50%] border bg-background p-6 shadow-lg sm:rounded-lg overflow-hidden">

              {/* 1. Main Content Wrapper */}
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <Dialog.Title className="text-lg font-semibold">
                    Select Date
                  </Dialog.Title>
                  <Dialog.Close disabled={loading}>
                    <X className="h-4 w-4" />
                  </Dialog.Close>
                </div>

                <DateSelector
                  value={tempDate}
                  onChange={setTempDate}
                  availableDates={availableDates}
                />

                <Button className="w-full" onClick={handleDone} disabled={loading}>
                  Done
                </Button>
              </div>

              {/* 2. Loading Overlay - Moved outside the flex container to ignore its layout/spacing */}
              {loading && (
                <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <span className="text-foreground font-semibold animate-pulse">
                    Loading Menu...
                  </span>
                </div>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {/* Desktop Picker */}
      <div className="hidden md:block relative bg-none">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "relative h-10 w-10 md:w-auto p-0 md:px-4 shrink-0 rounded-full border gap-2"
              )}
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
