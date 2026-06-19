/**
 * useTypewriter - reveals text character-by-character for a typewriter effect.
 */

import { useEffect, useRef, useState } from 'react';

/** Props for useTypewriter. */
export interface UseTypewriterOptions {
  /** Full text to reveal. */
  text: string;
  /** Milliseconds per character. */
  speed?: number;
  /** Start immediately on mount/text change. */
  start?: boolean;
}

/** Returns the visible substring and control functions. */
export function useTypewriter({
  text,
  speed = 30,
  start = true,
}: UseTypewriterOptions) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    clear();
    setDisplayed('');
    setDone(false);
    indexRef.current = 0;

    if (!start || !text) {
      setDisplayed(text);
      setDone(true);
      return;
    }

    timerRef.current = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) {
        clear();
        setDone(true);
      }
    }, speed);

    return clear;
  }, [text, speed, start]);

  /** Skip to the full text immediately. */
  const skip = () => {
    clear();
    setDisplayed(text);
    setDone(true);
  };

  return { displayed, done, skip };
}
