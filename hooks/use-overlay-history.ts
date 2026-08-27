"use client";

import {
  overlayIdFromState,
  pushOverlayHistory,
  shouldCloseOverlayOnPop,
  shouldPopHistoryOnUiClose,
} from "@/lib/overlay-history";
import { useEffect, useId, useRef, useState } from "react";

export function useOverlayHistory(
  open: boolean,
  onOpenChange?: (open: boolean) => void,
): (open: boolean) => void {
  const overlayId = useId();
  const pushedRef = useRef(false);
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    if (open) {
      if (overlayIdFromState(window.history.state) === overlayId) {
        pushedRef.current = true;
        return;
      }

      if (!pushedRef.current) {
        pushOverlayHistory(overlayId);
        pushedRef.current = true;
      }

      return;
    }

    if (
      shouldPopHistoryOnUiClose(
        pushedRef.current,
        overlayId,
        window.history.state,
      )
    ) {
      pushedRef.current = false;
      window.history.back();
      return;
    }

    pushedRef.current = false;
  }, [open, overlayId]);

  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      if (!shouldCloseOverlayOnPop(pushedRef.current, overlayId, event.state)) {
        return;
      }

      pushedRef.current = false;
      onOpenChangeRef.current?.(false);
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [overlayId]);

  return function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      onOpenChangeRef.current?.(true);
      return;
    }

    if (
      shouldPopHistoryOnUiClose(
        pushedRef.current,
        overlayId,
        window.history.state,
      )
    ) {
      window.history.back();
      return;
    }

    pushedRef.current = false;
    onOpenChangeRef.current?.(false);
  };
}

export function useOverlayOpenChange(
  open: boolean | undefined,
  defaultOpen: boolean | undefined,
  onOpenChange?: (open: boolean) => void,
) {
  const isControlled = open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen ?? false);
  const isOpen = isControlled ? open : uncontrolledOpen;

  const handleOpenChange = useOverlayHistory(isOpen, (next) => {
    if (!isControlled) {
      setUncontrolledOpen(next);
    }

    onOpenChange?.(next);
  });

  return { open: isOpen, onOpenChange: handleOpenChange };
}
