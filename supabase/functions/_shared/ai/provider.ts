// Provider-agnostic AI interface. The app talks to `AiProvider`; swapping
// providers means adding a new implementation and changing AI_PROVIDER.
import type { z } from "zod";
import type { AiTask } from "../core/prompts.ts";

export interface AiRequest<T> {
  task: AiTask;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  /** Reasoning depth; mapped by each provider. */
  effort: "low" | "medium" | "high";
  maxTokens: number;
  /** Used only by the mock provider to produce request-shaped output. */
  mock: () => T;
}

export interface AiResult<T> {
  data: T;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

export class AiError extends Error {
  constructor(
    public kind: "refused" | "invalid_output" | "rate_limited" | "unavailable" | "config" | "timeout",
    message: string,
  ) {
    super(message);
  }
}

export interface AiProvider {
  name: string;
  generate<T>(req: AiRequest<T>): Promise<AiResult<T>>;
}
