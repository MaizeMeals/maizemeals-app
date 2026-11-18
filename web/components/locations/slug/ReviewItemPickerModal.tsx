"use client";

import { UtensilsCrossed } from "lucide-react";
import { Item } from "@/types/dining";
import { cn } from "@/lib/utils";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Item[];
  onSelectItem: (item: Item) => void;
};

export function ReviewItemPickerModal({
  open,
  onOpenChange,
  items,
  onSelectItem,
}: Props) {
  const handleSelect = (item: Item) => {
    onSelectItem(item);
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="pr-8">
            What would you like to review?
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
              <UtensilsCrossed className="mb-2 h-10 w-10 opacity-40" />
              <p>No menu items to review right now.</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={cn(
                      "w-full rounded-lg px-3 py-3 text-left",
                      "transition-colors hover:bg-muted",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    )}
                  >
                    <span className="font-medium text-foreground">
                      {item.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
