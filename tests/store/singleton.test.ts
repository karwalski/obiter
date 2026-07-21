/**
 * SAFE-006 — getStoreInitError(): the singleton records the last store-init
 * rejection so views can surface a banner instead of silently defaulting.
 * The getSharedStore contract itself is unchanged (still rejects on failure,
 * never retries until reset).
 */

let mockInitImpl: () => Promise<void> = () => Promise.resolve();
let mockConstructedCount = 0;

jest.mock("../../src/store/citationStore", () => ({
  CitationStore: class MockCitationStore {
    constructor() {
      mockConstructedCount += 1;
    }
    initStore(): Promise<void> {
      return mockInitImpl();
    }
  },
}));

import { getSharedStore, resetSharedStore, getStoreInitError } from "../../src/store/singleton";

describe("singleton getStoreInitError", () => {
  beforeEach(() => {
    resetSharedStore();
    mockConstructedCount = 0;
    mockInitImpl = () => Promise.resolve();
  });

  it("is null before init and after a successful init", async () => {
    expect(getStoreInitError()).toBeNull();
    await getSharedStore();
    expect(getStoreInitError()).toBeNull();
  });

  it("records the rejection error and still rejects the caller", async () => {
    mockInitImpl = () => Promise.reject(new Error("no custom XML parts"));
    await expect(getSharedStore()).rejects.toThrow("no custom XML parts");
    expect(getStoreInitError()).toBeInstanceOf(Error);
    expect(getStoreInitError()?.message).toBe("no custom XML parts");
  });

  it("wraps non-Error rejection reasons in an Error", async () => {
    mockInitImpl = () => Promise.reject("string reason");
    await expect(getSharedStore()).rejects.toBe("string reason");
    expect(getStoreInitError()).toBeInstanceOf(Error);
    expect(getStoreInitError()?.message).toBe("string reason");
  });

  it("keeps the failed-init contract: repeat calls reject without retrying", async () => {
    mockInitImpl = () => Promise.reject(new Error("init failed"));
    await expect(getSharedStore()).rejects.toThrow("init failed");
    await expect(getSharedStore()).rejects.toThrow("init failed");
    expect(mockConstructedCount).toBe(1);
    expect(getStoreInitError()?.message).toBe("init failed");
  });

  it("returns the same instance for concurrent and subsequent successful calls", async () => {
    const [a, b] = await Promise.all([getSharedStore(), getSharedStore()]);
    const c = await getSharedStore();
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(mockConstructedCount).toBe(1);
  });

  it("resetSharedStore clears the recorded error and allows a fresh init", async () => {
    mockInitImpl = () => Promise.reject(new Error("init failed"));
    await expect(getSharedStore()).rejects.toThrow("init failed");
    resetSharedStore();
    expect(getStoreInitError()).toBeNull();
    mockInitImpl = () => Promise.resolve();
    await getSharedStore();
    expect(getStoreInitError()).toBeNull();
  });
});
