// OpenAI implementation of AiProvider (Responses API + strict structured outputs).
// Server-side only: OPENAI_API_KEY never leaves the Edge Function environment.
import OpenAI from "openai";
import { AiError, type AiProvider, type AiRequest, type AiResult } from "./provider.ts";
import { strictJsonSchema } from "./strictSchema.ts";

export const DEFAULT_OPENAI_MODEL = "gpt-5.5";

/** Reasoning effort is only sent to reasoning-capable model families. */
const supportsReasoning = (model: string) => /^(gpt-5|o\d)/.test(model) && !/chat-latest/.test(model);

export function openaiProvider(): AiProvider {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new AiError("config", "OPENAI_API_KEY is not configured");
  const model = Deno.env.get("OPENAI_MODEL") || DEFAULT_OPENAI_MODEL;
  const client = new OpenAI({ apiKey, timeout: 75_000, maxRetries: 1 });

  return {
    name: "openai",
    async generate<T>(req: AiRequest<T>): Promise<AiResult<T>> {
      const schema = strictJsonSchema(req.schema);
      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt++) {
        let response: OpenAI.Responses.Response;
        try {
          response = await client.responses.create({
            model,
            instructions: req.system,
            input: req.user,
            max_output_tokens: req.maxTokens,
            ...(supportsReasoning(model) ? { reasoning: { effort: req.effort } } : {}),
            text: { format: { type: "json_schema", name: req.task, schema, strict: true } },
            store: false,
          });
        } catch (err) {
          if (err instanceof OpenAI.RateLimitError) throw new AiError("rate_limited", "The AI service is busy. Please try again in a minute.");
          if (err instanceof OpenAI.APIConnectionTimeoutError) throw new AiError("timeout", "The AI took too long to respond. Please try again.");
          if (err instanceof OpenAI.AuthenticationError) throw new AiError("config", "AI provider authentication failed");
          if (err instanceof OpenAI.BadRequestError) throw new AiError("unavailable", `AI request rejected: ${err.message}`);
          if (err instanceof OpenAI.APIError || err instanceof OpenAI.APIConnectionError) throw new AiError("unavailable", "The AI service is temporarily unavailable.");
          throw err;
        }
        const refused = response.output.some((o) => o.type === "message" && o.content.some((c) => c.type === "refusal"));
        if (refused) throw new AiError("refused", "This request couldn't be completed. Try rephrasing it.");
        if (response.status === "incomplete") {
          lastError = new Error(`incomplete: ${response.incomplete_details?.reason ?? "unknown"}`);
          continue;
        }
        try {
          const parsed = req.schema.safeParse(JSON.parse(response.output_text));
          if (!parsed.success) throw new Error(parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
          return { data: parsed.data, model: response.model, inputTokens: response.usage?.input_tokens ?? null, outputTokens: response.usage?.output_tokens ?? null };
        } catch (err) {
          lastError = err;
        }
      }
      console.error("AI output failed validation", req.task, lastError instanceof Error ? lastError.message.slice(0, 300) : "");
      throw new AiError("invalid_output", "The AI returned an unexpected response. Please try again.");
    },
  };
}
