import { z } from "zod";

// Thin typed client for the X API v2 endpoints this app uses: the home
// timeline (with an own-posts fallback for API tiers that can't read it),
// plus the token refresh for grants better-auth stores in the account table.

const X_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const X_API_BASE = "https://api.x.com/2";

export class XApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "XApiError";
    this.status = status;
  }
}

const apiErrorSchema = z.object({
  title: z.string().optional(),
  detail: z.string().optional(),
  error_description: z.string().optional(),
  error: z.string().optional(),
});

const errorFromResponse = async (response: Response): Promise<XApiError> => {
  let message = `X API request failed (${response.status})`;
  try {
    const body = apiErrorSchema.parse(await response.json());
    const detail = body.detail ?? body.error_description ?? body.title ?? body.error;
    if (detail !== undefined) message = detail;
  } catch {
    // Non-JSON error body — keep the status message.
  }
  return new XApiError(response.status, message);
};

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
});

export type TokenGrant = {
  accessToken: string;
  refreshToken?: string;
  /** Unix ms, with a safety margin subtracted so a grant is refreshed early. */
  expiresAt: number;
};

const EXPIRY_MARGIN_MS = 60_000;

/** Refresh an X OAuth 2.0 grant (confidential client). */
export const refreshXToken = async (
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<TokenGrant> => {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  });
  if (!response.ok) throw await errorFromResponse(response);
  const grant = tokenResponseSchema.parse(await response.json());
  const result: TokenGrant = {
    accessToken: grant.access_token,
    expiresAt: Date.now() + grant.expires_in * 1000 - EXPIRY_MARGIN_MS,
  };
  if (grant.refresh_token !== undefined) result.refreshToken = grant.refresh_token;
  return result;
};

const xUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  profile_image_url: z.string().optional(),
});

const metricsSchema = z.object({
  like_count: z.number().optional(),
  retweet_count: z.number().optional(),
  reply_count: z.number().optional(),
  quote_count: z.number().optional(),
});

const timelinePostSchema = z.object({
  id: z.string(),
  text: z.string(),
  created_at: z.string().optional(),
  author_id: z.string().optional(),
  note_tweet: z.object({ text: z.string() }).optional(),
  referenced_tweets: z.array(z.object({ type: z.string(), id: z.string() })).optional(),
  public_metrics: metricsSchema.optional(),
});

const timelineResponseSchema = z.object({
  data: z.array(timelinePostSchema).optional(),
  includes: z
    .object({
      users: z.array(xUserSchema).optional(),
      tweets: z.array(timelinePostSchema).optional(),
    })
    .optional(),
  meta: z.object({ next_token: z.string().optional() }).optional(),
});

export type FeedPost = {
  id: string;
  text: string;
  createdAt?: string;
  /** Engagement score: retweets and quotes weigh most, then replies, likes. */
  score: number;
  author: {
    name: string;
    username: string;
    profileImageUrl?: string;
  };
};

export type FeedSource = "home" | "own";

export type FeedPage = {
  source: FeedSource;
  posts: FeedPost[];
  nextToken?: string;
};

const scoreFromMetrics = (metrics: z.infer<typeof metricsSchema> | undefined): number => {
  if (metrics === undefined) return 0;
  return (
    (metrics.like_count ?? 0) +
    2 * (metrics.reply_count ?? 0) +
    3 * (metrics.retweet_count ?? 0) +
    3 * (metrics.quote_count ?? 0)
  );
};

const TIMELINE_PARAMS = {
  max_results: "50",
  "tweet.fields": "created_at,author_id,note_tweet,referenced_tweets,public_metrics",
  expansions: "author_id,referenced_tweets.id",
  "user.fields": "name,username,profile_image_url",
} as const;

type TimelinePage = {
  posts: FeedPost[];
  nextToken?: string;
};

const fetchTimeline = async (
  accessToken: string,
  path: string,
  paginationToken?: string,
): Promise<TimelinePage> => {
  const url = new URL(`${X_API_BASE}${path}`);
  for (const [key, value] of Object.entries(TIMELINE_PARAMS)) {
    url.searchParams.set(key, value);
  }
  if (paginationToken !== undefined) url.searchParams.set("pagination_token", paginationToken);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw await errorFromResponse(response);
  const timeline = timelineResponseSchema.parse(await response.json());

  const usersById = new Map((timeline.includes?.users ?? []).map((user) => [user.id, user]));
  const referencedById = new Map(
    (timeline.includes?.tweets ?? []).map((tweet) => [tweet.id, tweet]),
  );

  const posts = (timeline.data ?? []).map((post) => {
    // Retweet text arrives truncated ("RT @…"); use the referenced post's
    // full text so the video prompt sees the whole thing. Long posts carry
    // their full text in note_tweet.
    const retweetRef = (post.referenced_tweets ?? []).find((ref) => ref.type === "retweeted");
    const source = retweetRef === undefined ? post : (referencedById.get(retweetRef.id) ?? post);
    const text = source.note_tweet?.text ?? source.text;

    const author = post.author_id === undefined ? undefined : usersById.get(post.author_id);
    const result: FeedPost = {
      id: post.id,
      text,
      // A retweet's own metrics are near zero; the referenced original's
      // engagement is what makes it "popular".
      score: scoreFromMetrics(source.public_metrics),
      author: {
        name: author?.name ?? "Unknown",
        username: author?.username ?? "unknown",
      },
    };
    if (post.created_at !== undefined) result.createdAt = post.created_at;
    if (author?.profile_image_url !== undefined) {
      result.author.profileImageUrl = author.profile_image_url;
    }
    return result;
  });

  const page: TimelinePage = { posts };
  if (timeline.meta?.next_token !== undefined) page.nextToken = timeline.meta.next_token;
  return page;
};

const timelinePath = (source: FeedSource, userId: string): string =>
  source === "home"
    ? `/users/${userId}/timelines/reverse_chronological`
    : `/users/${userId}/tweets`;

/**
 * One page of the reverse-chronological home timeline, falling back to the
 * viewer's own posts when the account may not read it (403). Pass a previous
 * page's source + nextToken to keep paginating.
 *
 * 402 is deliberately not a fallback: since X moved to pay-per-use it means
 * the credit balance is spent, and the own-posts call would fail the same way
 * after being charged for the attempt.
 */
export const fetchFeedPage = async (
  accessToken: string,
  userId: string,
  source?: FeedSource,
  paginationToken?: string,
): Promise<FeedPage> => {
  if (source !== undefined) {
    const page = await fetchTimeline(accessToken, timelinePath(source, userId), paginationToken);
    return { source, ...page };
  }
  try {
    const page = await fetchTimeline(accessToken, timelinePath("home", userId), paginationToken);
    return { source: "home", ...page };
  } catch (error) {
    if (error instanceof XApiError && error.status === 402) {
      throw new XApiError(402, "X API credits exhausted — top up at console.x.com");
    }
    if (!(error instanceof XApiError && error.status === 403)) throw error;
    const page = await fetchTimeline(accessToken, timelinePath("own", userId), paginationToken);
    return { source: "own", ...page };
  }
};
