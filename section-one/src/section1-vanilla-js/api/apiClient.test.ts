import {
  apiFetch,
  fetchWithRetry,
  createLatestOnlyFetcher,
  ApiError,
} from "./apiClient";

/**
 * SETUP NOTE: How to mock `fetch`
 * --------------------------------
 * jsdom does not implement fetch, so we install a jest.fn() on the global
 * object ourselves. Because jest.config.js has `restoreMocks: true`, this
 * gets reset automatically before every test — but since it's a fresh
 * `jest.fn()` assignment (not a spy on an existing method), we re-assign
 * it in `beforeEach` to guarantee a clean slate regardless of config.
 */
function mockFetchOnce(response: Partial<Response> & { jsonBody?: unknown }) {
  const { jsonBody, ok = true, status = 200 } = response;
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: async () => jsonBody,
  } as Response);
}

beforeEach(() => {
  global.fetch = jest.fn();
});

describe("apiFetch", () => {
  it("returns parsed JSON on a successful response", async () => {
    mockFetchOnce({ jsonBody: { id: "p1", name: "Wireless Mouse" } });

    const result = await apiFetch<{ id: string; name: string }>(
      "/api/products/p1",
    );

    expect(result).toEqual({ id: "p1", name: "Wireless Mouse" });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("throws ApiError with the status code on a non-2xx response", async () => {
    mockFetchOnce({ ok: false, status: 404, jsonBody: {} });

    await expect(apiFetch("/api/products/missing")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
    });
  });

  it("throws ApiError when fetch itself rejects (network failure)", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(apiFetch("/api/products")).rejects.toThrow(ApiError);
  });

  it("aborts and throws ApiError when the request exceeds timeoutMs", async () => {
    jest.useFakeTimers();

    // fetch that never resolves on its own, only reacts to abort signal
    global.fetch = jest.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    }) as unknown as typeof fetch;

    const promise = apiFetch("/api/slow", { timeoutMs: 1000 });
    const assertion = expect(promise).rejects.toThrow(
      "Request timed out or was aborted",
    );

    jest.advanceTimersByTime(1000);
    await assertion;

    jest.useRealTimers();
  });

  it("propagates an externally-provided AbortSignal", async () => {
    const controller = new AbortController();
    global.fetch = jest.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      });
    }) as unknown as typeof fetch;

    const promise = apiFetch("/api/products", { signal: controller.signal });
    controller.abort();

    await expect(promise).rejects.toThrow(ApiError);
  });
});

describe("fetchWithRetry", () => {
  it("succeeds immediately without retrying when the first call works", async () => {
    mockFetchOnce({ jsonBody: [{ id: "p1" }] });

    const result = await fetchWithRetry(
      "/api/products",
      {},
      { baseDelayMs: 1 },
    );

    expect(result).toEqual([{ id: "p1" }]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("retries on a 500 and eventually succeeds", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response);

    const result = await fetchWithRetry(
      "/api/products",
      {},
      { retries: 3, baseDelayMs: 1 },
    );

    expect(result).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry on a 4xx client error (fails fast)", async () => {
    mockFetchOnce({ ok: false, status: 400, jsonBody: {} });

    await expect(
      fetchWithRetry("/api/products", {}, { baseDelayMs: 1 }),
    ).rejects.toMatchObject({
      status: 400,
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("throws the last error after exhausting all retries", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response);

    await expect(
      fetchWithRetry("/api/products", {}, { retries: 2, baseDelayMs: 1 }),
    ).rejects.toMatchObject({ status: 503 });

    // 1 initial attempt + 2 retries = 3 calls
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});

describe("createLatestOnlyFetcher (race condition safety)", () => {
  it("only resolves with the result of the LAST call, ignoring stale ones", async () => {
    // Simulates: request for "a" is slow, request for "app" is fast.
    // Without abort-based cancellation, "a" would resolve last and win.
    const responses: Record<string, { delay: number; value: string }> = {
      a: { delay: 50, value: "results-for-a" },
      app: { delay: 5, value: "results-for-app" },
    };

    let currentQuery = "a";

    const fetchSearch = createLatestOnlyFetcher<string>((signal) => {
      const { delay, value } = responses[currentQuery];
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve(value), delay);
        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });

    const staleCall = fetchSearch(); // "a" — slow, will be aborted
    currentQuery = "app";
    const freshCall = fetchSearch(); // "app" — fast, should win

    await expect(staleCall).rejects.toThrow("Aborted");
    await expect(freshCall).resolves.toBe("results-for-app");
  });
});
