// src/section1-vanilla-js/utils/storage.ts
//
// Dynamic Module Pattern: createStorage(namespace) returns a closure-bound
// set of functions. Each call gets its OWN private `namespace` variable
// captured in the closure -- two different namespaces never collide, and
// nothing about the internals leaks out except the returned methods.

interface StorageAPI<T> {
  get: (fallback: T) => T;
  set: (value: T) => boolean;
  remove: () => void;
}

export function createStorage<T>(namespace: string): StorageAPI<T> {
  const key = `app:${namespace}`;

  return {
    get(fallback: T): T {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw) as T;
      } catch {
        // Covers both a getItem throw (e.g. storage disabled/quota in
        // some browsers) and a JSON.parse throw (corrupted data).
        return fallback;
      }
    },

    set(value: T): boolean {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        // QuotaExceededError or storage unavailable (private browsing in
        // some Safari versions). Fail soft, don't crash the app.
        return false;
      }
    },

    remove(): void {
      window.localStorage.removeItem(key);
    },
  };
}

// A ready-made instance for the dashboard's auth/session persistence,
// used again in Section 2 for the auth hook.
export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
}

export const sessionStorage_ = createStorage<Session | null>('session');
