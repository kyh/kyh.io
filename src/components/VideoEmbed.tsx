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

function RedditEmbed({ url }: { url: string }) {
  const [height, setHeight] = useState(400)

  // Normalize URL to ensure it ends properly for embed
  const embedUrl = url.includes('?')
    ? `${url}&ref_source=embed&embed=true`
    : `${url}?ref_source=embed&embed=true`

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.origin === 'https://www.reddit.com' && e.data?.type === 'resize') {
        setHeight(e.data.height || 400)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <iframe
      src={embedUrl}
      sandbox="allow-scripts allow-same-origin allow-popups"
      style={{ border: 'none', width: '100%', height }}
      scrolling="no"
      allowFullScreen
    />
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
