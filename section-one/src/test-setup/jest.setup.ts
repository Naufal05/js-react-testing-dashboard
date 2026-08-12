import '@testing-library/jest-dom';
import { serialize, deserialize } from 'node:v8';

/**
 * jest-environment-jsdom does not copy Node's built-in `structuredClone`
 * onto the jsdom global object (a known gap), even though Node itself has
 * had it globally since v17. We polyfill it here using V8's own
 * serialize/deserialize, which — like real structuredClone — correctly
 * handles nested objects/arrays, Date, Map, and Set (unlike a naive
 * JSON.parse(JSON.stringify(...)) polyfill, which would silently corrupt
 * Dates into strings and drop Map/Set entirely).
 */
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = <T>(value: T): T => deserialize(serialize(value));
}

/**
 * WHY THIS FILE EXISTS
 * --------------------
 * jsdom *does* ship a real localStorage implementation, but two problems
 * show up constantly in interviews/real projects:
 *
 * 1. Data leaks between tests because nobody clears it -> flaky "works in
 *    isolation, fails in the suite" bugs.
 * 2. You can't assert "setItem was called with X" against jsdom's native
 *    implementation without wrapping it in jest.spyOn, which is easy to
 *    forget and easy to set up wrong (spying on the prototype vs the
 *    instance).
 *
 * Fix: build a small in-memory store ourselves, wire it up as
 * window.localStorage, and expose it as a real jest.fn() for every method
 * so `expect(localStorage.setItem).toHaveBeenCalledWith(...)` just works
 * everywhere, in every test file, with zero per-file boilerplate.
 */
function createMockLocalStorage() {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => (key in store ? store[key] : null)),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    key: jest.fn((index: number) => Object.keys(store)[index] ?? null),
    get length() {
      return Object.keys(store).length;
    },
    // test-only escape hatch to inspect raw state if ever needed
    __getStore: () => store,
  };
}

Object.defineProperty(window, 'localStorage', {
  value: createMockLocalStorage(),
  writable: true,
});

// Reset call history AND stored data before every single test, regardless
// of which describe block or file it lives in.
beforeEach(() => {
  window.localStorage.clear();
  jest.clearAllMocks();
});
