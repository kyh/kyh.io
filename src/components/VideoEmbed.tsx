'use client'

import { useEffect, useState } from 'react'

import type { VideoPlatform } from '@/db/schema'
import { extractVideoId } from '@/lib/video-utils'

interface VideoEmbedProps {
  url: string
  platform: VideoPlatform
}

const platformNames: Record<VideoPlatform, string> = {
  twitter: 'x',
  youtube: 'youtube',
  tiktok: 'tiktok',
  facebook: 'facebook',
  instagram: 'instagram',
  linkedin: 'linkedin',
  pinterest: 'pinterest',
  reddit: 'reddit',
}

interface EmbedComponentProps {
  url: string
  width?: string | number
  height?: string | number
  placeholderDisabled?: boolean
}

function FallbackLink({
  url,
  platform,
}: {
  url: string
  platform: VideoPlatform
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-neutral-200 p-4 text-sm text-neutral-500 hover:border-neutral-400 hover:text-neutral-900"
    >
      open on {platformNames[platform]}
    </a>
  )
}

interface RedditPost {
  title: string
  subreddit: string
  author: string
  score: number
  num_comments: number
  thumbnail?: string
  selftext?: string
  is_video?: boolean
  media?: { reddit_video?: { fallback_url: string } }
}

function RedditEmbed({ url }: { url: string }) {
  const [post, setPost] = useState<RedditPost | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Fetch post data from Reddit's JSON API
    const cleanUrl = url.split('?')[0].replace(/\/$/, '')
    const jsonUrl = `${cleanUrl}.json`

    fetch(jsonUrl)
      .then((res) => res.json())
      .then((data) => {
        const postData = data?.[0]?.data?.children?.[0]?.data
        if (postData) {
          setPost(postData)
        } else {
          setError(true)
        }
      })
      .catch(() => setError(true))
  }, [url])

  if (error) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block border border-neutral-200 p-4 text-sm text-neutral-500 hover:border-neutral-400 hover:text-neutral-900"
      >
        open on reddit
      </a>
    )
  }

  if (!post) {
    return (
      <div className="border border-neutral-200 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-100" />
      </div>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-neutral-200 p-4 transition-colors hover:border-neutral-400"
    >
      <div className="mb-2 text-xs text-neutral-400">
        r/{post.subreddit} · u/{post.author}
      </div>
      <div className="mb-2 text-sm font-medium text-neutral-900">{post.title}</div>
      {post.selftext && (
        <div className="mb-2 line-clamp-3 text-sm text-neutral-500">
          {post.selftext}
        </div>
      )}
      {post.is_video && post.media?.reddit_video?.fallback_url && (
        <video
          src={post.media.reddit_video.fallback_url}
          controls
          className="mb-2 max-h-[400px] w-full rounded"
          playsInline
        />
      )}
      <div className="text-xs text-neutral-400">
        {post.score} points · {post.num_comments} comments
      </div>
    </a>
  )
}

export function VideoEmbed({ url, platform }: VideoEmbedProps) {
  const [Embed, setEmbed] =
    useState<React.ComponentType<EmbedComponentProps> | null>(null)
  const videoId = extractVideoId(url, platform)

  useEffect(() => {
    if (!videoId || platform === 'reddit') return

    import('react-social-media-embed').then((mod) => {
      const embedMap: Partial<
        Record<VideoPlatform, React.ComponentType<EmbedComponentProps>>
      > = {
        youtube: mod.YouTubeEmbed,
        twitter: mod.XEmbed,
        tiktok: mod.TikTokEmbed,
        facebook: mod.FacebookEmbed,
        instagram: mod.InstagramEmbed,
        linkedin: mod.LinkedInEmbed,
        pinterest: mod.PinterestEmbed,
      }
      const component = embedMap[platform]
      if (component) setEmbed(() => component)
    })
  }, [videoId, platform])

  // Reddit uses custom embed
  if (platform === 'reddit') {
    return (
      <div className="w-full max-w-[550px]">
        <RedditEmbed url={url} />
      </div>
    )
  }

  if (!videoId) {
    return <FallbackLink url={url} platform={platform} />
  }

  return (
    <div className="min-h-[400px] w-full max-w-[550px]">
      {Embed && <Embed url={url} width="100%" />}
    </div>
  )
}
