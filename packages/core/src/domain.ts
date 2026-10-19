import { z } from "zod";

/** Shared enumerations. Values match Postgres enum types in the migrations. */

export const PRIMARY_GOALS = [
  { id: "attract_clients", label: "Attract clients or customers" },
  { id: "grow_audience", label: "Grow an audience" },
  { id: "career", label: "Advance my career" },
  { id: "launch_business", label: "Launch or grow a business" },
  { id: "monetise_expertise", label: "Monetise my expertise" },
  { id: "document_journey", label: "Document my journey" },
  { id: "partnerships", label: "Land brand partnerships" },
] as const;
export type PrimaryGoal = (typeof PRIMARY_GOALS)[number]["id"];

export const BRAND_STAGES = [
  { id: "starting", label: "Starting from zero", detail: "No content or audience yet" },
  { id: "exploring", label: "Exploring", detail: "Posted a little, no clear direction" },
  { id: "building", label: "Building", detail: "Posting regularly, finding my niche" },
  { id: "growing", label: "Growing", detail: "Clear niche, growing audience" },
  { id: "monetising", label: "Monetising", detail: "Turning attention into income" },
] as const;
export type BrandStage = (typeof BRAND_STAGES)[number]["id"];

export const PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "x", label: "X" },
  { id: "youtube", label: "YouTube" },
  { id: "threads", label: "Threads" },
  { id: "newsletter", label: "Newsletter" },
  { id: "other", label: "Other" },
] as const;
export type Platform = (typeof PLATFORMS)[number]["id"];

export const COMMUNICATION_STYLES = [
  "Direct",
  "Warm",
  "Witty",
  "Analytical",
  "Calm",
  "Bold",
  "Story-driven",
  "Practical",
] as const;

export const MONETISATION_INTERESTS = [
  { id: "freelance", label: "Freelance services" },
  { id: "consulting", label: "Consulting / coaching" },
  { id: "digital_products", label: "Digital products" },
  { id: "partnerships", label: "Brand partnerships" },
  { id: "newsletter", label: "Paid newsletter / community" },
  { id: "career", label: "Career opportunities" },
  { id: "business", label: "My own business" },
  { id: "unsure", label: "Not sure yet" },
] as const;

export const PROOF_KINDS = [
  { id: "note", label: "Note", icon: "document-text-outline" },
  { id: "idea", label: "Idea", icon: "bulb-outline" },
  { id: "opinion", label: "Opinion", icon: "megaphone-outline" },
  { id: "lesson", label: "Lesson", icon: "school-outline" },
  { id: "story", label: "Story", icon: "book-outline" },
  { id: "achievement", label: "Achievement", icon: "trophy-outline" },
  { id: "challenge", label: "Mistake / challenge", icon: "construct-outline" },
  { id: "project_update", label: "Project update", icon: "rocket-outline" },
  { id: "observation", label: "Observation", icon: "eye-outline" },
  { id: "link", label: "Saved link", icon: "link-outline" },
  { id: "voice", label: "Voice note", icon: "mic-outline" },
] as const;
export type ProofKind = (typeof PROOF_KINDS)[number]["id"];
export const PROOF_KIND_IDS = PROOF_KINDS.map((k) => k.id) as [ProofKind, ...ProofKind[]];

export const CONTENT_FORMATS = [
  { id: "carousel", label: "Instagram carousel", slides: true },
  { id: "single_image", label: "Single-image post", slides: true },
  { id: "educational", label: "Educational post", slides: true },
  { id: "personal_story", label: "Personal story", slides: true },
  { id: "opinion", label: "Opinion", slides: true },
  { id: "how_to", label: "How-to", slides: true },
  { id: "list", label: "List / checklist", slides: true },
  { id: "myth_fact", label: "Myth vs fact", slides: true },
  { id: "comparison", label: "Comparison", slides: true },
  { id: "caption", label: "Caption only", slides: false },
  { id: "hooks", label: "Hook ideas", slides: false },
] as const;
export type ContentFormat = (typeof CONTENT_FORMATS)[number]["id"];
export const CONTENT_FORMAT_IDS = CONTENT_FORMATS.map((f) => f.id) as [ContentFormat, ...ContentFormat[]];

export const CONTENT_STATUSES = [
  { id: "idea", label: "Idea" },
  { id: "draft", label: "Draft" },
  { id: "ready", label: "Ready to publish" },
  { id: "published", label: "Published" },
  { id: "archived", label: "Archived" },
] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number]["id"];
export const CONTENT_STATUS_IDS = CONTENT_STATUSES.map((s) => s.id) as [ContentStatus, ...ContentStatus[]];

export const GENERATION_SOURCES = [
  { id: "proof", label: "Proof Bank entry" },
  { id: "topic", label: "A topic" },
  { id: "pillar", label: "A content pillar" },
  { id: "audience_problem", label: "An audience problem" },
  { id: "experience", label: "A personal experience" },
  { id: "lesson", label: "A lesson" },
  { id: "goal", label: "One of my goals" },
  { id: "previous_post", label: "A previous post" },
  { id: "experiment", label: "A growth experiment" },
  { id: "blank", label: "Blank idea" },
] as const;
export type GenerationSource = (typeof GENERATION_SOURCES)[number]["id"];
export const GENERATION_SOURCE_IDS = GENERATION_SOURCES.map((s) => s.id) as [GenerationSource, ...GenerationSource[]];

export const EXPERIMENT_STATUSES = ["planned", "running", "completed", "abandoned"] as const;
export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

export const OFFER_TYPES = [
  { id: "freelance", label: "Freelance service" },
  { id: "consulting", label: "Consulting / coaching" },
  { id: "digital_product", label: "Digital product" },
  { id: "partnership", label: "Brand partnership package" },
  { id: "newsletter", label: "Newsletter / community" },
  { id: "speaking", label: "Speaking / workshops" },
  { id: "career", label: "Career / hire me" },
  { id: "other", label: "Other" },
] as const;
export type OfferType = (typeof OFFER_TYPES)[number]["id"];
export const OFFER_TYPE_IDS = OFFER_TYPES.map((o) => o.id) as [OfferType, ...OfferType[]];

export const LEAD_KINDS = [
  { id: "client", label: "Potential client" },
  { id: "lead", label: "Lead" },
  { id: "partner", label: "Partner / brand" },
  { id: "employer", label: "Employer / recruiter" },
  { id: "collaborator", label: "Collaborator" },
] as const;
export type LeadKind = (typeof LEAD_KINDS)[number]["id"];
export const LEAD_KIND_IDS = LEAD_KINDS.map((o) => o.id) as [LeadKind, ...LeadKind[]];

export const LEAD_STAGES = [
  { id: "identified", label: "Identified" },
  { id: "contacted", label: "Contacted" },
  { id: "replied", label: "Replied" },
  { id: "meeting", label: "Meeting" },
  { id: "proposal", label: "Proposal" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number]["id"];
export const LEAD_STAGE_IDS = LEAD_STAGES.map((o) => o.id) as [LeadStage, ...LeadStage[]];

export const LEAD_ACTIVITY_KINDS = ["outreach", "reply", "meeting", "proposal", "note", "outcome"] as const;
export type LeadActivityKind = (typeof LEAD_ACTIVITY_KINDS)[number];

export const RECOMMENDATION_STATUSES = ["pending", "accepted", "rejected", "deferred"] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

export const labelOf = <T extends { id: string; label: string }>(list: readonly T[], id: string | null | undefined) =>
  list.find((x) => x.id === id)?.label ?? id ?? "";

export const uuid = z.string().uuid();
