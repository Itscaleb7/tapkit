const mockMem = new Map<string, string>();
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async (k: string) => mockMem.get(k) ?? null),
  setItem: jest.fn(async (k: string, v: string) => void mockMem.set(k, v)),
}));
const mockInsert = jest.fn();
jest.mock("../supabase", () => ({
  supabase: { from: () => ({ insert: (row: unknown) => ({ select: () => ({ single: () => mockInsert(row) }) }) }) },
}));

import { enqueueCapture, flushOutbox, pendingCount } from "../outbox";

describe("offline capture outbox", () => {
  beforeEach(() => {
    mockMem.clear();
    mockInsert.mockReset();
  });
  it("queues captures and syncs them when back online", async () => {
    await enqueueCapture("u1", { kind: "lesson", body: "offline lesson" });
    await enqueueCapture("u2", { kind: "idea", body: "someone else's" });
    expect(await pendingCount("u1")).toBe(1);
    mockInsert.mockResolvedValue({ data: { id: "e1" }, error: null });
    expect(await flushOutbox("u1")).toEqual(["e1"]);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "u1", body: "offline lesson" }));
    expect(await pendingCount("u1")).toBe(0);
    expect(await pendingCount("u2")).toBe(1); // other users' captures untouched
  });
  it("keeps captures that fail with a network error", async () => {
    await enqueueCapture("u1", { kind: "lesson", body: "x" });
    mockInsert.mockResolvedValue({ data: null, error: { message: "TypeError: Network request failed (fetch)" } });
    expect(await flushOutbox("u1")).toEqual([]);
    expect(await pendingCount("u1")).toBe(1);
  });
  it("drops captures the server permanently rejects", async () => {
    await enqueueCapture("u1", { kind: "lesson", body: "x" });
    mockInsert.mockResolvedValue({ data: null, error: { message: "LIMIT_REACHED: Proof Bank is limited" } });
    await flushOutbox("u1");
    expect(await pendingCount("u1")).toBe(0);
  });
});
