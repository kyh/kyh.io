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
}

function FallbackLink({ url, platform }: { url: string; platform: VideoPlatform }) {
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

function LoadingPlaceholder() {
  return (
    <div className="border border-neutral-200 p-4 text-sm text-neutral-400">
      Loading...
    </div>
  )
}

export function VideoEmbed({ url, platform }: VideoEmbedProps) {
  const [Embed, setEmbed] = useState<React.ComponentType<{ url: string; width: string }> | null>(null)
  const videoId = extractVideoId(url, platform)

  useEffect(() => {
    if (!videoId) return

    // Dynamic import only on client
    import('react-social-media-embed').then((mod) => {
      const embedMap: Record<VideoPlatform, React.ComponentType<{ url: string; width: string }>> = {
        youtube: mod.YouTubeEmbed,
        twitter: mod.XEmbed,
        tiktok: mod.TikTokEmbed,
        facebook: mod.FacebookEmbed,
        instagram: mod.InstagramEmbed,
        linkedin: mod.LinkedInEmbed,
        pinterest: mod.PinterestEmbed,
      }
      setEmbed(() => embedMap[platform])
    })
  }, [videoId, platform])

  if (!videoId) {
    return <FallbackLink url={url} platform={platform} />
  }

  if (!Embed) {
    return (
      <div className="w-full max-w-[550px]">
        <LoadingPlaceholder />
      </div>
    )
  }

  return (
    <div className="w-full max-w-[550px]">
      <Embed url={url} width="100%" />
    </div>
  )
}
