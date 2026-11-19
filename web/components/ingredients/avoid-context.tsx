"use client";

import { createContext, useContext } from "react";
import { NO_AVOID, type AvoidPrefs } from "@/lib/avoid";

/** The viewer's saved Avoid choices, for list cards (one lookup per page, not per card). */
const AvoidContext = createContext<AvoidPrefs>(NO_AVOID);

export const AvoidProvider = AvoidContext.Provider;

export function useAvoid(): AvoidPrefs {
  return useContext(AvoidContext);
}
