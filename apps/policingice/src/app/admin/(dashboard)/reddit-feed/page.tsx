import { getFeedPosts } from "@/actions/admin";

import { RedditFeedClient } from "./reddit-feed-client";

const RedditFeedPage = async () => {
  const { posts, existingUrls } = await getFeedPosts();
  return <RedditFeedClient posts={posts} existingUrls={existingUrls} />;
};

export default RedditFeedPage;
