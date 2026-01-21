import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { RefreshCw } from 'lucide-react'

import { useToast } from '@/components/Toast'

import { db } from '@/db/index'
import { incidents, videos } from '@/db/schema'
import { detectPlatform } from '@/lib/video-utils'

interface FeedPost {
  id: string
  title: string
  link: string
  content: string
  published: string
}

function parseAtomFeed(xml: string): Array<FeedPost> {
  const posts: Array<FeedPost> = []
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  let match

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1]

    const id = entry.match(/<id>([^<]+)<\/id>/)?.[1] || ''
    const title = entry.match(/<title>([^<]+)<\/title>/)?.[1] || ''
    const link = entry.match(/<link href="([^"]+)"/)?.[1] || ''
    const content =
      entry.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] || ''
    const published = entry.match(/<updated>([^<]+)<\/updated>/)?.[1] || ''

    if (id && link) {
      posts.push({
        id,
        title: decodeHTMLEntities(title),
        link,
        content: decodeHTMLEntities(content),
        published,
      })
    }
  }

  return posts
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

// Normalize URL to just domain + path (no query string, trailing slash)
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    return `${u.origin}${u.pathname}`.replace(/\/$/, '')
  } catch {
    return url.split('?')[0].replace(/\/$/, '')
  }
}

const getFeedPosts = createServerFn({ method: 'GET' }).handler(async () => {
  const res = await fetch('https://www.reddit.com/r/ICE_Watch.rss', {
    headers: {
      'User-Agent': 'PolicingICE/1.0',
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch feed: ${res.status}`)
  }

  const xml = await res.text()
  const posts = parseAtomFeed(xml)

  // Get all existing reddit video URLs
  const existingVideos = await db.query.videos.findMany({
    where: (v, { like }) => like(v.url, '%reddit.com%'),
    columns: { url: true },
  })
  const existingUrls = existingVideos.map((v) => normalizeUrl(v.url))

  return { posts, existingUrls }
})

const createFromFeed = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { url: string; title: string; published: string }) => data,
  )
  .handler(async ({ data }) => {
    // Check if already exists
    const existing = await db.query.videos.findFirst({
      where: (v, { eq }) => eq(v.url, data.url),
    })

    if (existing) {
      return { success: false, error: 'Already added' }
    }

    // Create incident
    const [incident] = await db
      .insert(incidents)
      .values({
        description: data.title,
        incidentDate: data.published ? new Date(data.published) : new Date(),
        status: 'approved',
      })
      .returning()

    // Create video
    await db.insert(videos).values({
      incidentId: incident.id,
      url: data.url,
      platform: detectPlatform(data.url),
    })

    return { success: true, incidentId: incident.id }
  })

export const Route = createFileRoute('/admin/_layout/reddit-feed')({
  component: RedditFeed,
  loader: () => getFeedPosts(),
})

function RedditFeed() {
  const router = useRouter()
  const toast = useToast()
  const { posts, existingUrls } = Route.useLoaderData()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [addingUrl, setAddingUrl] = useState<string | null>(null)
  const existingSet = new Set(existingUrls)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await router.invalidate()
    setIsRefreshing(false)
  }

  const handleAdd = async (post: FeedPost) => {
    setAddingUrl(post.link)
    try {
      const result = await createFromFeed({
        data: {
          url: post.link,
          title: post.title,
          published: post.published,
        },
      })

      if (result.success) {
        toast.success('Incident created')
        router.invalidate() // Refresh to remove the added post
      } else {
        toast.error(result.error || 'Failed to create')
      }
    } finally {
      setAddingUrl(null)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium">
          Reddit Feed ({posts.length} posts)
        </h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex cursor-pointer items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-neutral-500">No posts found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-2 pr-3 font-normal">Title</th>
                <th className="py-2 pr-3 font-normal">Date</th>
                <th className="py-2 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => {
                const isAdding = addingUrl === post.link
                const isAdded = existingSet.has(normalizeUrl(post.link))

                return (
                  <tr key={post.id} className="border-b border-neutral-100">
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
                    <td className="py-3 pr-3 text-neutral-500">
                      {formatDate(post.published)}
                    </td>
                    <td className="py-3">
                      {isAdded ? (
                        <span className="text-neutral-400">added</span>
                      ) : (
                        <button
                          onClick={() => handleAdd(post)}
                          disabled={isAdding}
                          className="cursor-pointer text-green-600 hover:text-green-700 disabled:opacity-50"
                        >
                          {isAdding ? 'adding...' : '+add'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
