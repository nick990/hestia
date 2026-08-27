"use client";

import { createContext, useContext } from "react";

export type HomeNavRange = {
  from: string;
  to: string;
};

type HomeNavContextValue = {
  range: HomeNavRange;
  setRange: (range: HomeNavRange) => void;
  beginNav: () => number;
  isCurrentNav: (generation: number) => boolean;
};

export const HomeNavContext = createContext<HomeNavContextValue | null>(null);

export function useHomeNav() {
  const ctx = useContext(HomeNavContext);

  if (!ctx) {
    throw new Error("useHomeNav richiede HomeShell");
  }

  return ctx;
}
