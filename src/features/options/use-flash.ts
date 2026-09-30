import { useEffect, useRef, useState } from 'react';

export const FLASH_DURATION_MS = 2500;

export function useFlash(durationMs = FLASH_DURATION_MS): [boolean, () => void] {
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
  }, []);

  const show = () => {
    setActive(true);
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => setActive(false), durationMs);
  };

  return [active, show];
}
