// Deterministic provider for local development and automated tests only.
import { AiError, type AiProvider, type AiRequest, type AiResult } from "./provider.ts";

export function mockProvider(): AiProvider {
  return {
    name: "mock",
    generate<T>(req: AiRequest<T>): Promise<AiResult<T>> {
      const out = req.mock();
      // Validate exactly as real output is validated so tests exercise the same path.
      const parsed = req.schema.safeParse(out);
      if (!parsed.success) return Promise.reject(new AiError("invalid_output", `Mock output invalid for ${req.task}`));
      return Promise.resolve({ data: parsed.data, model: "mock", inputTokens: 0, outputTokens: 0 });
    },
  };
}
