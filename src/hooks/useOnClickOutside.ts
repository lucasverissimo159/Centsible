import { useEffect, type RefObject } from 'react';

export function useOnClickOutside(ref: RefObject<HTMLElement | null>, handler: () => void): void {
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const el = ref.current;
      if (!el || el.contains(event.target as Node)) return;
      handler();
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [ref, handler]);
}
