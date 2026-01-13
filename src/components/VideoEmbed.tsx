'use client'

import { useEffect, useRef, useState } from 'react'

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
  const containerRef = useRef<HTMLDivElement>(null)

  // Clean URL - remove query params for the embed link
  const cleanUrl = url.split('?')[0].replace(/\/$/, '')

  useEffect(() => {
    // Load Reddit embed script if not already loaded
    const scriptId = 'reddit-embed-script'
    let script = document.getElementById(scriptId) as HTMLScriptElement | null

    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://embed.reddit.com/widgets.js'
      script.async = true
      script.charset = 'UTF-8'
      document.body.appendChild(script)
    } else {
      // Script already exists, re-run embed detection
      // Reddit's widget.js exposes a global function to re-process embeds
      const win = window as typeof window & { rembeddit?: { init: () => void } }
      if (win.rembeddit?.init) {
        win.rembeddit.init()
      }
    }
  }, [cleanUrl])

  return (
    <div ref={containerRef}>
      <blockquote
        className="reddit-embed-bq"
        data-embed-showusername="false"
        data-embed-height="500"
      >
        <a href={cleanUrl}>Loading Reddit post...</a>
      </blockquote>
    </div>
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
