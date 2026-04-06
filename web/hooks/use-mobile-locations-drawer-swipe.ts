"use client";

import { useCallback, useRef, useState } from "react";

const SWIPE_DISTANCE = 56;
const DOMINANCE = 1.35;

type Args = {
  mdUp: boolean;
  mobileDrawerOpen: boolean;
  selectedId: string | null;
  onCloseListDrawer: () => void;
  onCloseDetail: () => void;
};

/**
 * Mobile: drawer enters from the left — swipe left to dismiss; horizontal drag
 * follows the finger off-screen to the left.
 */
export function useMobileLocationsDrawerSwipe({
  mdUp,
  mobileDrawerOpen,
  selectedId,
  onCloseListDrawer,
  onCloseDetail,
}: Args) {
  const [dragX, setDragX] = useState(0);
  const drawerStart = useRef<{ x: number; y: number } | null>(null);
  const drawerIntent = useRef<"unknown" | "horizontal" | "vertical">("unknown");

  const resetDrag = useCallback(() => {
    drawerStart.current = null;
    drawerIntent.current = "unknown";
    setDragX(0);
  }, []);

  const onDrawerTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (mdUp || !mobileDrawerOpen) return;
      if (
        (e.target as HTMLElement).closest(
          "input, textarea, button, a, [data-no-drawer-swipe]",
        )
      ) {
        return;
      }
      const t = e.touches[0];
      drawerStart.current = { x: t.clientX, y: t.clientY };
      drawerIntent.current = "unknown";
    },
    [mdUp, mobileDrawerOpen],
  );

  const onDrawerTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!drawerStart.current || mdUp || !mobileDrawerOpen) return;
      const t = e.touches[0];
      const dx = t.clientX - drawerStart.current.x;
      const dy = t.clientY - drawerStart.current.y;

      if (drawerIntent.current === "unknown") {
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);
        if (ay > 12 && ay > ax * DOMINANCE) {
          drawerIntent.current = "vertical";
          drawerStart.current = null;
          setDragX(0);
          return;
        }
        if (ax > 12 && ax > ay * DOMINANCE) drawerIntent.current = "horizontal";
      }
      if (drawerIntent.current !== "horizontal") return;
      // Leftward swipe (dx < 0): panel follows off the left edge
      if (dx < 0) setDragX(Math.min(Math.abs(dx), typeof window !== "undefined" ? window.innerWidth : 2000));
      else setDragX(0);
    },
    [mdUp, mobileDrawerOpen],
  );

  const onDrawerTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (mdUp || !mobileDrawerOpen) {
        resetDrag();
        return;
      }
      const origin = drawerStart.current;
      const t = e.changedTouches[0];
      if (!origin) {
        resetDrag();
        return;
      }
      const dx = t.clientX - origin.x;
      const dy = t.clientY - origin.y;

      if (
        drawerIntent.current === "horizontal" &&
        dx < -SWIPE_DISTANCE &&
        Math.abs(dx) > Math.abs(dy) * DOMINANCE
      ) {
        if (selectedId) onCloseDetail();
        else onCloseListDrawer();
      }
      resetDrag();
    },
    [mdUp, mobileDrawerOpen, selectedId, onCloseDetail, onCloseListDrawer, resetDrag],
  );

  return {
    dragX,
    drawerTouchHandlers: {
      onTouchStart: onDrawerTouchStart,
      onTouchMove: onDrawerTouchMove,
      onTouchEnd: onDrawerTouchEnd,
    },
  };
}
