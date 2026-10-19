import { assert, assertEquals } from "jsr:@std/assert@1";
import * as S from "../core/schemas.ts";
import { strictJsonSchema } from "./strictSchema.ts";

const FORBIDDEN = ["minLength", "maxLength", "minItems", "maxItems", "minimum", "maximum", "pattern", "format", "$schema"];

/** Visits every schema node (skipping `properties` maps, whose keys are field names, not keywords). */
function walk(node: unknown, visit: (o: Record<string, unknown>) => void) {
  if (Array.isArray(node)) return node.forEach((n) => walk(n, visit));
  if (node && typeof node === "object") {
    visit(node as Record<string, unknown>);
    for (const [k, v] of Object.entries(node)) {
      if (k === "properties") Object.values(v as object).forEach((p) => walk(p, visit));
      else walk(v, visit);
    }
  }
}

const AI_SCHEMAS = {
  brandBlueprint: S.brandBlueprintSchema,
  alternatives: S.alternativePositioningSchema,
  classification: S.proofClassificationSchema,
  content: S.generatedContentSchema,
  experiment: S.experimentAnalysisSchema,
  weekly: S.weeklyReviewAiSchema,
  offer: S.offerAssistSchema,
};

for (const [name, schema] of Object.entries(AI_SCHEMAS)) {
  Deno.test(`${name}: strict-mode compatible`, () => {
    const js = strictJsonSchema(schema);
    walk(js, (o) => {
      for (const k of FORBIDDEN) assert(!(k in o), `${name} still has ${k}`);
      if (o.type === "object") {
        assertEquals(o.additionalProperties, false);
        assertEquals([...(o.required as string[])].sort(), Object.keys(o.properties as object).sort());
      }
    });
  });
}
