"use client";

import { useEffect } from "react";

/**
 * Empêche le zoom de la page (pincement, Ctrl+molette) : seul le visualiseur
 * d'œuvre ([data-zoomable]) zoome. iOS Safari ignore `user-scalable=no`,
 * d'où les écouteurs gesture* / touchmove.
 */
export function PageZoomLock() {
  useEffect(() => {
    const inZoomable = (target: EventTarget | null) => target instanceof Element && target.closest("[data-zoomable]") !== null;

    const onGesture = (e: Event) => {
      if (!inZoomable(e.target)) e.preventDefault();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1 && !inZoomable(e.target)) e.preventDefault();
    };
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey && !inZoomable(e.target)) e.preventDefault();
    };

    document.addEventListener("gesturestart", onGesture, { passive: false });
    document.addEventListener("gesturechange", onGesture, { passive: false });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", onGesture);
      document.removeEventListener("gesturechange", onGesture);
      document.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("wheel", onWheel);
    };
  }, []);
  return null;
}
