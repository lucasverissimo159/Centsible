import { useEffect, useRef } from 'react';

interface ShortcutOptions {
  /** Require Cmd (Mac) or Ctrl (Windows/Linux) — the platform-agnostic "mod" key. */
  mod?: boolean;
  shift?: boolean;
  preventDefault?: boolean;
  enabled?: boolean;
}

/**
 * Registers a global keyboard shortcut. `callback` is kept in a ref, so
 * callers don't need to memoize it themselves and the listener only
 * re-subscribes when the shortcut definition itself changes. Shortcuts are
 * automatically ignored while the user is typing in a text field.
 */
export function useKeyboardShortcut(key: string, callback: () => void, options: ShortcutOptions = {}): void {
  const { mod = false, shift = false, preventDefault = true, enabled = true } = options;
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isTyping) return;

      const modMatches = mod ? event.metaKey || event.ctrlKey : !event.metaKey && !event.ctrlKey;
      const shiftMatches = shift ? event.shiftKey : !event.shiftKey;

      if (modMatches && shiftMatches && event.key.toLowerCase() === key.toLowerCase()) {
        if (preventDefault) event.preventDefault();
        callbackRef.current();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, mod, shift, preventDefault, enabled]);
}
