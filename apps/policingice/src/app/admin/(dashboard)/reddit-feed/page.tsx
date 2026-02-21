import { getFeedPosts } from "@/actions/admin";

import { RedditFeedClient } from "./reddit-feed-client";

export default async function RedditFeedPage() {
  const { posts, existingUrls } = await getFeedPosts();
  return <RedditFeedClient posts={posts} existingUrls={existingUrls} />;
}
