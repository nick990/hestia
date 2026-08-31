import { useSyncExternalStore } from "react";

const MIN_MD = "(min-width: 768px)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(MIN_MD);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(MIN_MD).matches;
}

function getServerSnapshot() {
  return false;
}

export function useMinMd() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
