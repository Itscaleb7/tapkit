import { anthropicProvider } from "./anthropic.ts";
import { mockProvider } from "./mock.ts";
import { openaiProvider } from "./openai.ts";
import { AiError, type AiProvider } from "./provider.ts";

export * from "./provider.ts";

/** Centralised provider selection. AI_PROVIDER=anthropic (default) | openai | mock (dev/test only). */
export function getProvider(): AiProvider {
  const name = (Deno.env.get("AI_PROVIDER") ?? "anthropic").toLowerCase();
  if (name === "mock") {
    if ((Deno.env.get("ENVIRONMENT") ?? "").toLowerCase() === "production") {
      throw new AiError("config", "The mock AI provider cannot be used in production");
    }
    return mockProvider();
  }
  if (name === "anthropic") return anthropicProvider();
  if (name === "openai") return openaiProvider();
  throw new AiError("config", `Unknown AI_PROVIDER "${name}"`);
}
