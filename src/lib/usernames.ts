import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";

export const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;

const RESERVED = new Set([
  "admin",
  "administrator",
  "mod",
  "moderator",
  "root",
  "system",
  "sirtet",
  "support",
  "staff",
  "official",
  "anonymous",
  "guest",
  "null",
  "undefined",
]);

const RESERVED_PREFIXES = ["player_"];

const profanityMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

/** Returns an error code, or null when the username is acceptable. */
export function usernameProblem(username: string): string | null {
  if (!USERNAME_REGEX.test(username)) return "invalid_format";
  const lower = username.toLowerCase();
  if (RESERVED.has(lower)) return "reserved";
  if (RESERVED_PREFIXES.some((p) => lower.startsWith(p))) return "reserved";
  if (profanityMatcher.hasMatch(username)) return "not_allowed";
  return null;
}
