// The kinds of source a channel can be. Shared by the schema, the API contract
// and the adapters, and small enough to reach the client bundle untouched.
export const SOURCE_KINDS = ["x", "gmail", "rss", "youtube"] as const;

export type SourceKind = (typeof SOURCE_KINDS)[number];
