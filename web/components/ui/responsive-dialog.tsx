"use client";

import * as React from "react";
import { useMdUp } from "@/hooks/use-md-up";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

/**
 * The app's default modal: a swipeable bottom drawer on phones (vaul) and a
 * centered dialog at md+ (Radix Dialog). Same API either way:
 *
 *   <ResponsiveDialog open={open} onOpenChange={setOpen}>
 *     <ResponsiveDialogContent>
 *       <ResponsiveDialogHeader>
 *         <ResponsiveDialogTitle>Rate this dish</ResponsiveDialogTitle>
 *         <ResponsiveDialogDescription>…</ResponsiveDialogDescription>
 *       </ResponsiveDialogHeader>
 *       <ResponsiveDialogBody>…</ResponsiveDialogBody>
 *       <ResponsiveDialogFooter>…</ResponsiveDialogFooter>
 *     </ResponsiveDialogContent>
 *   </ResponsiveDialog>
 *
 * Every modal needs a Title (use `className="sr-only"` to hide it visually).
 */

const ModeContext = React.createContext<"dialog" | "drawer">("drawer");
const useMode = () => React.useContext(ModeContext);

type RootProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

function ResponsiveDialog({ children, ...props }: RootProps) {
  const mdUp = useMdUp();
  const mode = mdUp ? "dialog" : "drawer";
  const Root = mode === "dialog" ? Dialog : Drawer;
  return (
    <ModeContext.Provider value={mode}>
      <Root {...props}>{children}</Root>
    </ModeContext.Provider>
  );
}

function ResponsiveDialogTrigger(props: React.ComponentProps<typeof DialogTrigger>) {
  return useMode() === "dialog" ? <DialogTrigger {...props} /> : <DrawerTrigger {...props} />;
}

function ResponsiveDialogClose(props: React.ComponentProps<typeof DialogClose>) {
  return useMode() === "dialog" ? <DialogClose {...props} /> : <DrawerClose {...props} />;
}

function ResponsiveDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  if (useMode() === "dialog") {
    return (
      <DialogContent className={cn("max-h-[85dvh] gap-0 overflow-hidden rounded-2xl p-0", className)} {...props}>
        <div className="flex max-h-[85dvh] flex-col">{children}</div>
      </DialogContent>
    );
  }
  return (
    <DrawerContent className={cn("max-h-[92dvh]", className)} {...(props as React.ComponentProps<typeof DrawerContent>)}>
      <div className="flex min-h-0 flex-col pb-[env(safe-area-inset-bottom)]">{children}</div>
    </DrawerContent>
  );
}

function ResponsiveDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return useMode() === "dialog" ? (
    <DialogHeader className={cn("px-6 pb-2 pt-6 text-left", className)} {...props} />
  ) : (
    <DrawerHeader className={cn("px-4 pb-2 text-left", className)} {...props} />
  );
}

function ResponsiveDialogTitle(props: React.ComponentProps<typeof DialogTitle>) {
  return useMode() === "dialog" ? <DialogTitle {...props} /> : <DrawerTitle {...props} />;
}

function ResponsiveDialogDescription(props: React.ComponentProps<typeof DialogDescription>) {
  return useMode() === "dialog" ? <DialogDescription {...props} /> : <DrawerDescription {...props} />;
}

/** Scrollable middle section. */
function ResponsiveDialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const mode = useMode();
  return (
    <div
      className={cn("min-h-0 flex-1 overflow-y-auto", mode === "dialog" ? "px-6 py-2" : "px-4 py-2", className)}
      {...props}
    />
  );
}

function ResponsiveDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return useMode() === "dialog" ? (
    <DialogFooter className={cn("border-t border-border px-6 py-4", className)} {...props} />
  ) : (
    <DrawerFooter className={cn("border-t border-border px-4", className)} {...props} />
  );
}

export {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
};
