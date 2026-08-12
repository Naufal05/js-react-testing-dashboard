import { createStorage } from './storage.js';

/**
 * SETUP NOTE
 * ----------
 * window.localStorage is already replaced with a jest.fn()-backed mock in
 * src/test-setup/jest.setup.ts, and cleared before every test via a global
 * beforeEach. That means:
 *   - `localStorage.setItem` etc. are real jest mocks we can assert on
 *     directly, with NO per-file setup.
 *   - Every test starts with a genuinely empty store, so tests can never
 *     leak state into each other.
 */

interface UserPrefs {
  theme: 'light' | 'dark';
  currency: 'USD' | 'EUR';
}

describe('createStorage (module/closure pattern)', () => {
  it('returns the fallback when nothing is stored yet', () => {
    const prefsStorage = createStorage<UserPrefs>('prefs');
    const result = prefsStorage.get({ theme: 'light', currency: 'USD' });

    expect(result).toEqual({ theme: 'light', currency: 'USD' });
    expect(window.localStorage.getItem).toHaveBeenCalledWith('app:prefs');
  });

  it('persists a value and reads it back correctly', () => {
    const prefsStorage = createStorage<UserPrefs>('prefs');

    prefsStorage.set({ theme: 'dark', currency: 'EUR' });

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'app:prefs',
      JSON.stringify({ theme: 'dark', currency: 'EUR' })
    );
    expect(prefsStorage.get({ theme: 'light', currency: 'USD' })).toEqual({
      theme: 'dark',
      currency: 'EUR',
    });
  });

  it('removes a stored value', () => {
    const prefsStorage = createStorage<UserPrefs>('prefs');
    prefsStorage.set({ theme: 'dark', currency: 'EUR' });

    prefsStorage.remove();

    expect(window.localStorage.removeItem).toHaveBeenCalledWith('app:prefs');
    expect(prefsStorage.get({ theme: 'light', currency: 'USD' })).toEqual({
      theme: 'light',
      currency: 'USD',
    });
  });

  it('falls back gracefully when stored JSON is corrupted (edge case)', () => {
    const prefsStorage = createStorage<UserPrefs>('prefs');
    // Simulate corrupted data written by a previous app version / manual edit.
    window.localStorage.setItem('app:prefs', '{not-valid-json');

    const result = prefsStorage.get({ theme: 'light', currency: 'USD' });

    expect(result).toEqual({ theme: 'light', currency: 'USD' });
  });

  it('fails soft (returns false) when setItem throws, e.g. quota exceeded (edge case)', () => {
    const prefsStorage = createStorage<UserPrefs>('prefs');
    (window.localStorage.setItem as jest.Mock).mockImplementationOnce(() => {
      throw new DOMException('QuotaExceededError');
    });

    const success = prefsStorage.set({ theme: 'dark', currency: 'EUR' });

    expect(success).toBe(false);
  });

  it('keeps two namespaces fully isolated from each other', () => {
    const cartStorage = createStorage<{ count: number }>('cart');
    const wishlistStorage = createStorage<{ count: number }>('wishlist');

    cartStorage.set({ count: 3 });
    wishlistStorage.set({ count: 7 });

    expect(cartStorage.get({ count: 0 })).toEqual({ count: 3 });
    expect(wishlistStorage.get({ count: 0 })).toEqual({ count: 7 });
  });
});
