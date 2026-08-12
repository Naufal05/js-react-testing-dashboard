// src/section1-vanilla-js/api/apiClient.ts
//
// Three concepts, deliberately kept separate so each is independently
// testable:
//   1. apiFetch      -> a typed wrapper around global fetch with timeout
//                        + normalized error handling.
//   2. fetchWithRetry -> exponential backoff retry on top of apiFetch.
//   3. createLatestOnlyFetcher -> solves the classic "race condition" bug:
//        user types "a", "ap", "app" fast. The "a" request resolves LAST
//        because of network jitter and overwrites the correct "app"
//        result. AbortController cancels every request except the most
//        recent one.

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * Wraps global fetch with:
 * - a timeout (via AbortController, composed with any signal the caller passes)
 * - JSON parsing
 * - non-2xx responses converted into thrown ApiError instead of silently
 *   resolving (fetch famously does NOT reject on 404/500)
 */
export async function apiFetch<T>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const { timeoutMs = 8000, signal, ...rest } = options;

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  // Compose caller-provided signal with our own timeout signal so either
  // one can cancel the request.
  const onCallerAbort = () => timeoutController.abort();
  signal?.addEventListener('abort', onCallerAbort);

  try {
    const response = await fetch(url, { ...rest, signal: timeoutController.signal });

    if (!response.ok) {
      throw new ApiError(`Request failed with status ${response.status}`, response.status);
    }

    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Request timed out or was aborted', undefined, err);
    }
    throw new ApiError('Network error', undefined, err);
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onCallerAbort);
  }
}

interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  /** Only retry on errors that pass this check (e.g. 5xx, not 4xx). */
  shouldRetry?: (err: unknown) => boolean;
}

export function defaultShouldRetry(err: unknown): boolean {
  if (err instanceof ApiError && err.status) {
    return err.status >= 500; // retry server errors, not client errors like 400/404
  }
  return true; // retry network failures / timeouts
}

/**
 * Retries a request with exponential backoff: baseDelay, baseDelay*2,
 * baseDelay*4, ...
 */
export async function fetchWithRetry<T>(
  url: string,
  options: ApiFetchOptions = {},
  retryOptions: RetryOptions = {}
): Promise<T> {
  const { retries = 3, baseDelayMs = 200, shouldRetry = defaultShouldRetry } = retryOptions;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await apiFetch<T>(url, options);
    } catch (err) {
      lastError = err;
      const isLastAttempt = attempt === retries;
      if (isLastAttempt || !shouldRetry(err)) {
        throw err;
      }
      const delay = baseDelayMs * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError; // unreachable, satisfies TS
}

/**
 * Factory that returns a fetcher function guaranteeing only the LATEST
 * call's result is ever delivered. Every prior in-flight call is aborted.
 * This is THE pattern for search-as-you-type, filter panels, tab switches.
 */
export function createLatestOnlyFetcher<T>(fetcher: (signal: AbortSignal) => Promise<T>) {
  let currentController: AbortController | null = null;

  return async function run(): Promise<T> {
    currentController?.abort();
    const controller = new AbortController();
    currentController = controller;

    try {
      return await fetcher(controller.signal);
    } finally {
      if (currentController === controller) {
        currentController = null;
      }
    }
  };
}
