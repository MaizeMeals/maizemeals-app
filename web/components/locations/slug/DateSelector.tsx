"use client";

import React, { useMemo } from "react";
import {
  WheelPicker,
  WheelPickerWrapper,
  WheelPickerOption,
} from "@/components/wheel-picker/wheel-picker";

interface DateSelectorProps {
  value: string;
  onChange: (date: string) => void;
  availableDates?: string[];
}

export function DateSelector({
  value,
  onChange,
  availableDates,
}: DateSelectorProps) {
  // Using EST/EDT for consistency with backend
  const todayStr = useMemo(
    () =>
      new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }),
    [],
  );

  // 3. Generate a large range of dates (Infinite Carnival feel)
  // +/- 60 days from Today (sufficient for menu planning)
  const dateOptions: WheelPickerOption[] = useMemo(() => {
    const dates: WheelPickerOption[] = [];
    const baseDate = new Date(); // Current Date

    // Range: -30 to +60
    for (let i = -30; i <= 60; i++) {
      const d = new Date();
      d.setDate(baseDate.getDate() + i);
      const full = d.toLocaleDateString("en-CA", {
        timeZone: "America/New_York",
      });

      const dayName = d
        .toLocaleDateString("en-US", {
          weekday: "short",
          timeZone: "America/New_York",
        })
        .toUpperCase();
      const dayNum = d.getDate();

      // Determine if date is available (if prop provided)
      const isAvailable = availableDates ? availableDates.includes(full) : true;

      let label = (
        <div
          className={`flex flex-col items-center justify-center leading-none ${!isAvailable ? "opacity-30" : ""}`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {dayName}
          </span>
          <span className="text-xl font-bold">{dayNum}</span>
        </div>
      );

      if (full === todayStr) {
        label = (
          <div
            className={`flex flex-col items-center justify-center leading-none ${!isAvailable ? "opacity-30" : ""}`}
          >
            <span className="text-[10px] font-bold text-maize uppercase tracking-wider">
              TODAY
            </span>
            <span className="text-xl font-bold">{dayNum}</span>
          </div>
        );
      }

      dates.push({
        value: full,
        label: label,
        disabled: !isAvailable,
      });
    }
    return dates;
  }, [todayStr, availableDates]);

  return (
    <div className="flex items-center justify-center h-48 overflow-hidden w-full bg-background rounded-lg">
      <WheelPickerWrapper className="w-full border-none bg-none dark:bg-none">
        <WheelPicker
          options={dateOptions}
          value={value}
          onValueChange={onChange}
          optionItemHeight={50}
          classNames={{
            highlightWrapper: "bg-muted border border-primary",
            optionItem:
              "text-muted-foreground text-center flex items-center justify-center",
            highlightItem:
              "font-bold text-foreground text-center flex items-center justify-center",
          }}
        />
      </WheelPickerWrapper>
    </div>
  );
}
