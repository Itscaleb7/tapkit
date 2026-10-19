import type { AiTask } from "@tapkit/core";
import { AppError, toAppError } from "./errors";
import { supabase } from "./supabase";

/** Call an Edge Function with the user's JWT and map errors into AppErrors. */
export async function invoke<T>(fn: string, body: Record<string, unknown> = {}, timeoutMs = 120_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const { data, error } = await supabase.functions.invoke(fn, { body, signal: controller.signal } as never);
    if (error) {
      const ctx = (error as { context?: Response }).context;
      let payload: { error?: { code?: string; message?: string; upgrade?: boolean } } | null = null;
      try {
        payload = ctx && typeof ctx.json === "function" ? await ctx.json() : null;
      } catch {
        payload = null;
      }
      if (payload?.error) throw new AppError(payload.error.message ?? "Request failed", payload.error.code ?? "error", Boolean(payload.error.upgrade));
      throw toAppError(error);
    }
    return data as T;
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw new AppError("This is taking longer than expected. Please try again.", "timeout");
    throw toAppError(err);
  } finally {
    clearTimeout(timer);
  }
}

export const ai = <T>(task: AiTask, payload: Record<string, unknown> = {}) => invoke<T>("ai", { task, ...payload });

/** Unwrap a Supabase query result, throwing a friendly AppError. */
export function must<R extends { data: unknown; error: unknown }>(res: R): Extract<R, { error: null }>["data"] {
  if (res.error) throw toAppError(res.error);
  return res.data as Extract<R, { error: null }>["data"];
}
