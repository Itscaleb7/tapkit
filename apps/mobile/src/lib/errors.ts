/** Errors shown to users. `code` mirrors the edge-function / database error codes. */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string = "error",
    public upgrade = false,
  ) {
    super(message);
  }
}

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  const anyErr = err as { message?: string; code?: string } | null;
  const msg = anyErr?.message ?? String(err);
  if (/LIMIT_REACHED:\s*/.test(msg)) return new AppError(msg.replace(/^.*LIMIT_REACHED:\s*/, ""), "limit_reached", true);
  if (/PRO_REQUIRED:\s*/.test(msg)) return new AppError(msg.replace(/^.*PRO_REQUIRED:\s*/, ""), "pro_required", true);
  if (/JWT|refresh token|session/i.test(msg)) return new AppError("Your session has expired. Please sign in again.", "unauthenticated");
  if (/Network request failed|Failed to fetch|NetworkError|fetch failed/i.test(msg)) return new AppError("You appear to be offline. Check your connection and try again.", "offline");
  if (/duplicate key value.*slug/i.test(msg)) return new AppError("That portfolio address is already taken.", "conflict");
  if (/violates check constraint "published_requires_confirmation"/.test(msg)) return new AppError("Confirm the post is live before marking it published.", "invalid");
  return new AppError(msg || "Something went wrong", anyErr?.code ?? "error");
}
