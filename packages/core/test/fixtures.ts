import { blankSlide } from "../src/carousel/slides.ts";
import type { Slide } from "../src/schemas.ts";

export const sampleCarousel = (): Slide[] => [
  blankSlide("hook", { kicker: "Personal brand", heading: "Posting every day didn't grow my brand. This did.", body: "What I changed after 30 days of posting into the void →" }),
  blankSlide("title_body", { kicker: "Lesson 1", heading: "Consistency is a multiplier, not a strategy", body: "If nobody knows what you stand for, posting more just means more people forget you. Decide what you want to be known for first." }),
  blankSlide("list", { heading: "Three questions to find your niche", items: ["What do friends already ask you for help with?", "What could you talk about for an hour without notes?", "Who were you two years ago, and what did they need?"] }),
  blankSlide("checklist", { heading: "Before you hit publish", items: ["One idea per slide", "Hook in under 10 words", "A real example from your own life", "A clear next step"] }),
  blankSlide("quote", { heading: "What happened", body: "My first carousel got 14 likes. But one comment asked a question I could answer in a whole series." }),
  blankSlide("comparison", { heading: "Random posting vs a brand", left_title: "Random", right_title: "Brand", left_items: ["Chase trends", "Different topic daily", "No reason to follow"], right_items: ["Three clear pillars", "Recognisable style", "A promise to the audience"] }),
  blankSlide("myth_fact", { heading: "You need expertise before you can build a personal brand", body: "You need honesty. Documenting what you are learning is valuable to people one step behind you." }),
  blankSlide("big_number", { heading: "30 days", body: "of posting taught me more than a year of planning." }),
  blankSlide("cta", { heading: "Want the full framework?", body: "Save this post and follow for the rest of the series.", kicker: "Follow @alexbuilds" }),
];
