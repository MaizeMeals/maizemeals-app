"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X, UtensilsCrossed } from "lucide-react";
import { Item } from "@/types/dining";
import { cn } from "@/lib/utils";

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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-full max-w-md max-h-[85vh] translate-x-[-50%] translate-y-[-50%]",
            "border bg-background shadow-lg rounded-xl overflow-hidden flex flex-col",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
            <Dialog.Title className="text-lg font-semibold">
              What would you like to review?
            </Dialog.Title>
            <Dialog.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto p-2 flex-1 min-h-0">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
                <UtensilsCrossed className="w-10 h-10 mb-2 opacity-40" />
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
                        "w-full text-left px-3 py-3 rounded-lg",
                        "hover:bg-muted transition-colors",
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
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
