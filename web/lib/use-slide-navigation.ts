'use client';

import { useState, useEffect, useCallback } from 'react';

/** Clamp slide index within [0, total-1] */
export function clampSlideIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(index, total - 1));
}

type NavAction = 'next' | 'prev' | 'fullscreen' | 'exit' | null;

/** Map keyboard key to navigation action */
export function getNextAction(key: string): NavAction {
  switch (key) {
    case 'ArrowRight':
    case ' ':
      return 'next';
    case 'ArrowLeft':
      return 'prev';
    case 'f':
      return 'fullscreen';
    case 'Escape':
      return 'exit';
    default:
      return null;
  }
}

export interface UseSlideNavigationResult {
  currentSlide: number;
  setCurrentSlide: (index: number) => void;
  goNext: () => void;
  goPrev: () => void;
  toggleFullscreen: () => void;
}

export function useSlideNavigation(
  total: number,
  onExit?: () => void,
): UseSlideNavigationResult {
  const [currentSlide, setCurrentSlideRaw] = useState(0);

  const setCurrentSlide = useCallback(
    (index: number) => setCurrentSlideRaw(clampSlideIndex(index, total)),
    [total],
  );

  const goNext = useCallback(
    () => setCurrentSlideRaw((i) => clampSlideIndex(i + 1, total)),
    [total],
  );

  const goPrev = useCallback(
    () => setCurrentSlideRaw((i) => clampSlideIndex(i - 1, total)),
    [total],
  );

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const action = getNextAction(e.key);
      if (!action) return;

      e.preventDefault();
      switch (action) {
        case 'next':
          goNext();
          break;
        case 'prev':
          goPrev();
          break;
        case 'fullscreen':
          toggleFullscreen();
          break;
        case 'exit':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            onExit?.();
          }
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, toggleFullscreen, onExit]);

  return { currentSlide, setCurrentSlide, goNext, goPrev, toggleFullscreen };
}
