"use client";

import { theme } from "../../../styles/tokens.stylex";

import {
  animations,
  colors,
  fontSizeLineHeights,
  fontSizes,
  fontWeights,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";

import * as stylex from "@stylexjs/stylex";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { toast } from "@/components/toast";
import { createFromFeed } from "@/lib/admin-action";
import { formatDate } from "@/lib/format";

const styles = stylex.create({
  header: {
    marginBottom: spacing[4],
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heading: {
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
    fontWeight: fontWeights.medium,
  },
  refresh: {
    display: "flex",
    cursor: "pointer",
    alignItems: "center",
    gap: spacing[1],
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
    color: {
      default: theme.mutedForeground,
      "@media (hover: hover)": { default: theme.mutedForeground, ":hover": theme.foreground },
    },
    opacity: { default: null, ":disabled": 0.5 },
  },
  icon: { height: spacing[4], width: spacing[4] },
  spin: { animation: animations.spin },
  muted: {
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
    color: theme.mutedForeground,
  },
  scroller: { overflowX: "auto" },
  table: {
    width: "100%",
    minWidth: "600px",
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
  },
  headRow: {
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderColor: theme.border,
    textAlign: "left",
    color: theme.mutedForeground,
  },
  th: { paddingBlock: spacing[2], paddingRight: spacing[3], fontWeight: fontWeights.normal },
  thLast: { paddingBlock: spacing[2], fontWeight: fontWeights.normal },
  row: { borderBottomWidth: 1, borderBottomStyle: "solid", borderColor: theme.border },
  td: { paddingBlock: spacing[3], paddingRight: spacing[3] },
  tdLast: { paddingBlock: spacing[3] },
  tdMuted: { paddingBlock: spacing[3], paddingRight: spacing[3], color: theme.mutedForeground },
  link: {
    textDecorationLine: {
      default: null,
      "@media (hover: hover)": { default: null, ":hover": "underline" },
    },
  },
  mutedText: { color: theme.mutedForeground },
  add: {
    cursor: "pointer",
    color: {
      default: colors.green600,
      "@media (hover: hover)": { default: colors.green600, ":hover": colors.green700 },
    },
    opacity: { default: null, ":disabled": 0.5 },
  },
});

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
};

export const RedditFeedClient = ({ posts, existingUrls }: RedditFeedClientProps) => {
  const router = useRouter();
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

  return (
    <div>
      <div {...stylex.props(styles.header)}>
        <h2 {...stylex.props(styles.heading)}>Reddit Feed ({posts.length} posts)</h2>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          {...stylex.props(styles.refresh)}
        >
          <RefreshCw {...stylex.props(styles.icon, isRefreshing && styles.spin)} />
          Refresh
        </button>
      </div>

      {posts.length === 0 ? (
        <p {...stylex.props(styles.muted)}>No posts found.</p>
      ) : (
        <div {...stylex.props(styles.scroller)}>
          <table {...stylex.props(styles.table)}>
            <thead>
              <tr {...stylex.props(styles.headRow)}>
                <th {...stylex.props(styles.th)}>Title</th>
                <th {...stylex.props(styles.th)}>Date</th>
                <th {...stylex.props(styles.thLast)}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => {
                const isAdding = addingUrl === post.link;
                const isAdded = existingSet.has(normalizeUrl(post.link));

                return (
                  <tr key={post.id} {...stylex.props(styles.row)}>
                    <td {...stylex.props(styles.td)}>
                      <a
                        href={post.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        {...stylex.props(styles.link)}
                        title={post.title}
                      >
                        {post.title.length > 80 ? `${post.title.slice(0, 80)}...` : post.title}
                      </a>
                    </td>
                    <td {...stylex.props(styles.tdMuted)}>{formatDate(post.published) ?? "—"}</td>
                    <td {...stylex.props(styles.tdLast)}>
                      {isAdded ? (
                        <span {...stylex.props(styles.mutedText)}>added</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAdd(post)}
                          disabled={isAdding}
                          {...stylex.props(styles.add)}
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
};
