// Anthropic (Claude) implementation of AiProvider. Server-side only: the API key
// never leaves the Edge Function environment.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AiError, type AiProvider, type AiRequest, type AiResult } from "./provider.ts";

export const DEFAULT_MODEL = "claude-opus-5-5";

export function anthropicProvider(): AiProvider {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new AiError("config", "ANTHROPIC_API_KEY is not configured");
  const model = Deno.env.get("AI_MODEL") || DEFAULT_MODEL;
  // Per-request timeout below the Edge Function wall clock; SDK retries 408/409/429/5xx and connection errors.
  const client = new Anthropic({ apiKey, timeout: 75_000, maxRetries: 1 });

  return {
    name: "anthropic",
    async generate<T>(req: AiRequest<T>): Promise<AiResult<T>> {
      // The helper converts the Zod schema to a structured-output JSON schema and validates on parse.
      const format = zodOutputFormat(req.schema as never);
      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt++) {
        let response: Anthropic.Beta.Messages.BetaMessage;
        try {
          response = await client.beta.messages.create({
            model,
            max_tokens: req.maxTokens,
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            thinking: { type: "adaptive" },
            output_config: { effort: req.effort, format: { type: "json_schema", schema: format.schema } },
            system: req.system,
            messages: [{ role: "user", content: req.user }],
          });
        } catch (err) {
          if (err instanceof Anthropic.RateLimitError) throw new AiError("rate_limited", "The AI service is busy. Please try again in a minute.");
          if (err instanceof Anthropic.APIConnectionTimeoutError) throw new AiError("timeout", "The AI took too long to respond. Please try again.");
          if (err instanceof Anthropic.AuthenticationError) throw new AiError("config", "AI provider authentication failed");
          if (err instanceof Anthropic.BadRequestError) throw new AiError("unavailable", `AI request rejected: ${err.message}`);
          if (err instanceof Anthropic.APIError || err instanceof Anthropic.APIConnectionError) throw new AiError("unavailable", "The AI service is temporarily unavailable.");
          throw err;
        }
        if (response.stop_reason === "refusal") throw new AiError("refused", "This request couldn't be completed. Try rephrasing it.");
        const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
        if (response.stop_reason === "max_tokens") {
          lastError = new AiError("invalid_output", "The response was cut off");
          continue;
        }
        try {
          const data = format.parse(text) as T;
          return { data, model: response.model, inputTokens: response.usage.input_tokens ?? null, outputTokens: response.usage.output_tokens ?? null };
        } catch (err) {
          lastError = err;
        }
      }
      console.error("AI output failed validation", req.task, lastError instanceof Error ? lastError.message.slice(0, 300) : "");
      throw new AiError("invalid_output", "The AI returned an unexpected response. Please try again.");
    },
  };
}
