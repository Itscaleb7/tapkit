import { AppError, toAppError } from "../errors";

describe("toAppError", () => {
  it("maps database limit errors to upgrade-able AppErrors", () => {
    const e = toAppError({ message: "LIMIT_REACHED: Proof Bank is limited to 50 entries on your plan" });
    expect(e.code).toBe("limit_reached");
    expect(e.upgrade).toBe(true);
    expect(e.message).toBe("Proof Bank is limited to 50 entries on your plan");
  });
  it("maps Pro-only errors", () => {
    expect(toAppError({ message: "PRO_REQUIRED: Custom portfolio colours require TapKit Pro" }).code).toBe("pro_required");
  });
  it("maps network failures to offline", () => {
    expect(toAppError(new TypeError("Network request failed")).code).toBe("offline");
  });
  it("maps expired sessions", () => {
    expect(toAppError({ message: "Invalid Refresh Token: Refresh Token Not Found" }).code).toBe("unauthenticated");
  });
  it("explains the publish-confirmation constraint", () => {
    expect(toAppError({ message: 'new row violates check constraint "published_requires_confirmation"' }).message).toMatch(/Confirm the post is live/);
  });
  it("passes AppErrors through", () => {
    const a = new AppError("x", "y");
    expect(toAppError(a)).toBe(a);
  });
});
