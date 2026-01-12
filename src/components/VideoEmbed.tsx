'use client'

import {
  FacebookEmbed,
  InstagramEmbed,
  LinkedInEmbed,
  PinterestEmbed,
  PlaceholderEmbed,
  TikTokEmbed,
  XEmbed,
  YouTubeEmbed,
} from 'react-social-media-embed'

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

function LoadingPlaceholder({ url }: { url: string }) {
  return (
    <PlaceholderEmbed
      url={url}
      linkText="Loading..."
      style={{ border: '1px solid #e5e5e5', padding: '1rem' }}
    />
  )
}

export function VideoEmbed({ url, platform }: VideoEmbedProps) {
  const videoId = extractVideoId(url, platform)

  if (!videoId) {
    return <FallbackLink url={url} platform={platform} />
  }

  const embedProps = {
    url,
    width: '100%' as const,
    placeholderImageUrl: '',
    placeholderSpinner: <LoadingPlaceholder url={url} />,
  }

  return (
    <div className="w-full max-w-[550px]">
      {platform === 'youtube' && <YouTubeEmbed {...embedProps} />}
      {platform === 'twitter' && <XEmbed {...embedProps} />}
      {platform === 'tiktok' && <TikTokEmbed {...embedProps} />}
      {platform === 'facebook' && <FacebookEmbed {...embedProps} />}
      {platform === 'instagram' && <InstagramEmbed {...embedProps} />}
      {platform === 'linkedin' && <LinkedInEmbed {...embedProps} />}
      {platform === 'pinterest' && <PinterestEmbed {...embedProps} />}
    </div>
  )
}
