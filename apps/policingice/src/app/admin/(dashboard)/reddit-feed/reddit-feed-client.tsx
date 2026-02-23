"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { useToast } from "@/components/toast";
import { createFromFeed } from "@/lib/admin-action";

type FeedPost = {
  id: string;
  title: string;
  link: string;
  content: string;
  published: string;
};

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`.replace(/\/$/, "");
  } catch {
    return url.split("?")[0].replace(/\/$/, "");
  }
}

type RedditFeedClientProps = {
  posts: FeedPost[];
  existingUrls: string[];
}

export const RedditFeedClient = ({
  posts,
  existingUrls,
}: RedditFeedClientProps) => {
  const router = useRouter();
  const toast = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [addingUrl, setAddingUrl] = useState<string | null>(null);
  const existingSet = new Set(existingUrls);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setIsRefreshing(false);
  };

  const handleAdd = async (post: FeedPost) => {
    setAddingUrl(post.link);
    try {
      const result = await createFromFeed({
        url: post.link,
        title: post.title,
        published: post.published,
      });

      if (result.success) {
        toast.success("Incident created");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to create");
      }
    } finally {
      setAddingUrl(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium">
          Reddit Feed ({posts.length} posts)
        </h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex cursor-pointer items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No posts found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-3 font-normal">Title</th>
                <th className="py-2 pr-3 font-normal">Date</th>
                <th className="py-2 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => {
                const isAdding = addingUrl === post.link;
                const isAdded = existingSet.has(normalizeUrl(post.link));

                return (
                  <tr key={post.id} className="border-b border-border">
                    <td className="py-3 pr-3">
                      <a
                        href={post.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                        title={post.title}
                      >
                        {post.title.length > 80
                          ? `${post.title.slice(0, 80)}...`
                          : post.title}
                      </a>
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">
                      {formatDate(post.published)}
                    </td>
                    <td className="py-3">
                      {isAdded ? (
                        <span className="text-muted-foreground">added</span>
                      ) : (
                        <button
                          onClick={() => handleAdd(post)}
                          disabled={isAdding}
                          className="cursor-pointer text-green-600 hover:text-green-700 disabled:opacity-50"
                        >
                          {isAdding ? "adding..." : "+add"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
