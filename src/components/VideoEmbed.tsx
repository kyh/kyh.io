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

export function VideoEmbed({ url, platform }: VideoEmbedProps) {
  const [Embed, setEmbed] =
    useState<React.ComponentType<EmbedComponentProps> | null>(null)
  const videoId = extractVideoId(url, platform)

  useEffect(() => {
    if (!videoId) return

    import('react-social-media-embed').then((mod) => {
      const embedMap: Record<
        VideoPlatform,
        React.ComponentType<EmbedComponentProps>
      > = {
        youtube: mod.YouTubeEmbed,
        twitter: mod.XEmbed,
        tiktok: mod.TikTokEmbed,
        facebook: mod.FacebookEmbed,
        instagram: mod.InstagramEmbed,
        linkedin: mod.LinkedInEmbed,
        pinterest: mod.PinterestEmbed,
        reddit: mod.RedditEmbed,
      }
      setEmbed(() => embedMap[platform])
    })
  }, [videoId, platform])

  if (!videoId) {
    return <FallbackLink url={url} platform={platform} />
  }

  return (
    <div className="min-h-[400px] w-full max-w-[550px]">
      {Embed && <Embed url={url} width="100%" />}
    </div>
  )
}
