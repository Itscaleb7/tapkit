// Converts a Zod schema into the JSON Schema subset accepted by OpenAI strict
// structured outputs: every object closed (additionalProperties: false) with all
// properties required, and validation keywords removed. Constraints that are
// stripped here are still enforced afterwards by Zod validation.
import { z } from "zod";

const STRIP = new Set([
  "$schema", "minLength", "maxLength", "minItems", "maxItems", "minimum", "maximum",
  "exclusiveMinimum", "exclusiveMaximum", "pattern", "format", "default", "multipleOf",
]);

type Json = Record<string, unknown>;

function clean(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(clean);
  if (!node || typeof node !== "object") return node;
  const out: Json = {};
  for (const [k, v] of Object.entries(node as Json)) {
    if (STRIP.has(k)) continue;
    out[k] = k === "properties" ? Object.fromEntries(Object.entries(v as Json).map(([pk, pv]) => [pk, clean(pv)])) : clean(v);
  }
  if (out.type === "object" || out.properties) {
    out.additionalProperties = false;
    out.required = Object.keys((out.properties as Json) ?? {});
  }
  return out;
}

export function strictJsonSchema(schema: z.ZodType): Json {
  return clean(z.toJSONSchema(schema, { reused: "inline", unrepresentable: "any" })) as Json;
}
