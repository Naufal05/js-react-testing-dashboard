import { debounce, throttle, delegateClick } from "./domEvents";

/**
 * SETUP NOTE: testing time-based functions
 * -----------------------------------------
 * `jest.useFakeTimers()` replaces setTimeout/setInterval with mock
 * versions Jest controls manually via `jest.advanceTimersByTime(ms)`.
 * This makes a debounce test that would otherwise take real seconds run
 * instantly and deterministically. ALWAYS pair `useFakeTimers` in
 * `beforeEach` with `useRealTimers` in `afterEach` so it never leaks into
 * unrelated test files.
 */
describe("debounce", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("calls the function only once after rapid repeated calls settle", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 300);

    debounced();
    debounced();
    debounced();

    expect(fn).not.toHaveBeenCalled(); // hasn't fired yet — still waiting

    jest.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("passes through the arguments of the LAST call", () => {
    const fn = jest.fn();
    const debounced = debounce((query: string) => fn(query), 200);

    debounced("a");
    debounced("ap");
    debounced("app");
    jest.advanceTimersByTime(200);

    expect(fn).toHaveBeenCalledWith("app");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resets the timer on every call (does not fire early)", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 300);

    debounced();
    jest.advanceTimersByTime(200); // not yet 300ms
    debounced(); // resets the clock
    jest.advanceTimersByTime(200); // total real time 400ms, but only 200ms since last call

    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100); // now 300ms since the last call
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it(".cancel() prevents a pending call from firing (edge case)", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 300);

    debounced();
    debounced.cancel();
    jest.advanceTimersByTime(300);

    expect(fn).not.toHaveBeenCalled();
  });
});

describe("throttle", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("fires immediately on the first call", () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 1000);

    throttled();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("ignores calls that happen inside the cooldown window", () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 1000);

    throttled();
    throttled();
    throttled();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("allows another call once the cooldown has elapsed", () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 1000);

    throttled();
    jest.advanceTimersByTime(1000);
    throttled();

    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("delegateClick (event delegation)", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    container.innerHTML = `
      <ul>
        <li><button class="add-to-cart" data-id="p1">Add p1</button></li>
        <li><button class="add-to-cart" data-id="p2">Add p2</button></li>
        <li><span class="not-a-button">irrelevant</span></li>
      </ul>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("invokes the handler when a matching descendant is clicked", () => {
    const handler = jest.fn();
    delegateClick(container, ".add-to-cart", handler);

    const button = container.querySelector('[data-id="p2"]') as HTMLElement;
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][1]).toBe(button);
  });

  it("does not invoke the handler for clicks on non-matching elements (edge case)", () => {
    const handler = jest.fn();
    delegateClick(container, ".add-to-cart", handler);

    const span = container.querySelector(".not-a-button") as HTMLElement;
    span.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(handler).not.toHaveBeenCalled();
  });

  it("still works for elements added to the DOM AFTER the listener was attached", () => {
    const handler = jest.fn();
    delegateClick(container, ".add-to-cart", handler);

    const newButton = document.createElement("button");
    newButton.className = "add-to-cart";
    newButton.dataset.id = "p3";
    container.querySelector("ul")!.appendChild(newButton);

    newButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("the returned cleanup function removes the listener", () => {
    const handler = jest.fn();
    const cleanup = delegateClick(container, ".add-to-cart", handler);

    cleanup();

    const button = container.querySelector('[data-id="p1"]') as HTMLElement;
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(handler).not.toHaveBeenCalled();
  });
});
