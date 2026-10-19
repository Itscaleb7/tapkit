const mockStore = new Map<string, string>();
jest.mock("expo-secure-store", () => ({
  AFTER_FIRST_UNLOCK: 0,
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void mockStore.delete(k)),
}));
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));

import { secureStorage } from "../secureStorage";

describe("chunked secure storage", () => {
  beforeEach(() => mockStore.clear());
  it("round-trips values larger than a SecureStore item", async () => {
    const big = JSON.stringify({ access_token: "a".repeat(5000), refresh_token: "r" });
    await secureStorage.setItem("sb-auth-token", big);
    expect([...mockStore.keys()].filter((k) => k.startsWith("sb-auth-token__")).length).toBeGreaterThan(2);
    for (const v of mockStore.values()) expect(v.length).toBeLessThanOrEqual(1800);
    expect(await secureStorage.getItem("sb-auth-token")).toBe(big);
  });
  it("overwrites shorter values without leaving stale chunks", async () => {
    await secureStorage.setItem("k", "x".repeat(4000));
    await secureStorage.setItem("k", "short");
    expect(await secureStorage.getItem("k")).toBe("short");
    expect(mockStore.has("k__1")).toBe(false);
  });
  it("removes all chunks", async () => {
    await secureStorage.setItem("k", "x".repeat(4000));
    await secureStorage.removeItem("k");
    expect(mockStore.size).toBe(0);
    expect(await secureStorage.getItem("k")).toBeNull();
  });
});
