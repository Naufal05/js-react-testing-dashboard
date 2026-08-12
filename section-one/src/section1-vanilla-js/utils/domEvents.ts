// src/section1-vanilla-js/utils/domEvents.ts

/**
 * Debounce: closure over `timerId` remembers state between calls without
 * any external variable. Fires once, `wait` ms after the LAST call.
 * Includes a `.cancel()` escape hatch — essential for cleaning up in
 * React's useEffect return function later.
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  wait: number
): ((...args: Args) => void) & { cancel: () => void } {
  let timerId: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Args) => {
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(() => {
      timerId = null;
      fn(...args);
    }, wait);
  };

  debounced.cancel = () => {
    if (timerId) clearTimeout(timerId);
    timerId = null;
  };

  return debounced;
}

/**
 * Throttle: fires immediately on the first call, then ignores calls until
 * `limit` ms have passed. Good for scroll/resize handlers.
 */
export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  limit: number
): (...args: Args) => void {
  let inCooldown = false;

  return (...args: Args) => {
    if (inCooldown) return;
    fn(...args);
    inCooldown = true;
    setTimeout(() => {
      inCooldown = false;
    }, limit);
  };
}

/**
 * Event delegation: ONE listener on a container handles clicks for an
 * arbitrary, dynamically-changing number of child rows (e.g. "Add to
 * cart" buttons re-rendered on every fetch) instead of attaching/removing
 * a listener per row.
 */
export function delegateClick(
  container: HTMLElement,
  selector: string,
  handler: (event: MouseEvent, matchedEl: HTMLElement) => void
): () => void {
  const listener = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const matchedEl = target.closest(selector);
    if (matchedEl && container.contains(matchedEl)) {
      handler(event, matchedEl as HTMLElement);
    }
  };

  container.addEventListener('click', listener);
  return () => container.removeEventListener('click', listener); // cleanup fn
}
