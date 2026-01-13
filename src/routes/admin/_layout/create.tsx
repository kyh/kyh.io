import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { inArray } from 'drizzle-orm'

import { db } from '@/db/index'
import { incidents, videos } from '@/db/schema'
import { detectPlatform, isValidVideoUrl } from '@/lib/video-utils'

const bulkCreateIncidents = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { urls: string[]; groupAsOne: boolean; location?: string; incidentDate?: string }) =>
      data
  )
  .handler(async ({ data }) => {
    const validUrls = data.urls.filter((url) => isValidVideoUrl(url))
    if (validUrls.length === 0) {
      return { created: 0, skipped: 0, error: 'No valid URLs' }
    }

    // Check for existing URLs
    const existingVideos = await db.query.videos.findMany({
      where: inArray(videos.url, validUrls),
    })
    const existingUrls = new Set(existingVideos.map((v) => v.url))
    const newUrls = validUrls.filter((url) => !existingUrls.has(url))

    if (newUrls.length === 0) {
      return { created: 0, skipped: validUrls.length }
    }

    const incidentDate = data.incidentDate ? new Date(data.incidentDate) : null

    if (data.groupAsOne) {
      // Create single incident with all videos
      const [incident] = await db
        .insert(incidents)
        .values({
          location: data.location || null,
          incidentDate,
          status: 'approved',
        })
        .returning()

      await db.insert(videos).values(
        newUrls.map((url) => ({
          incidentId: incident.id,
          url,
          platform: detectPlatform(url),
        }))
      )

      return { created: 1, skipped: existingUrls.size }
    } else {
      // Create one incident per URL
      let created = 0
      for (const url of newUrls) {
        const [incident] = await db
          .insert(incidents)
          .values({
            location: data.location || null,
            incidentDate,
            status: 'approved',
          })
          .returning()

        await db.insert(videos).values({
          incidentId: incident.id,
          url,
          platform: detectPlatform(url),
        })
        created++
      }

      return { created, skipped: existingUrls.size }
    }
  })

export const Route = createFileRoute('/admin/_layout/create')({
  component: AdminCreate,
})

function AdminCreate() {
  const router = useRouter()
  const [urlsText, setUrlsText] = useState('')
  const [groupAsOne, setGroupAsOne] = useState(false)
  const [location, setLocation] = useState('')
  const [incidentDate, setIncidentDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)

  const urls = urlsText
    .split('\n')
    .map((u) => u.trim())
    .filter(Boolean)
  const validUrls = urls.filter((u) => isValidVideoUrl(u))
  const invalidUrls = urls.filter((u) => !isValidVideoUrl(u))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validUrls.length === 0) return

    setIsSubmitting(true)
    setResult(null)

    try {
      const res = await bulkCreateIncidents({
        data: {
          urls: validUrls,
          groupAsOne,
          location: location || undefined,
          incidentDate: incidentDate || undefined,
        },
      })
      setResult(res)
      if (res.created > 0) {
        setUrlsText('')
        setLocation('')
        setIncidentDate('')
        router.invalidate()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-sm font-medium">Bulk Create Incidents</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-neutral-500">Video URLs (one per line)</label>
          <textarea
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            rows={8}
            className="w-full rounded border border-neutral-200 bg-transparent p-2 text-sm outline-none focus:border-neutral-400"
            placeholder="https://x.com/user/status/123&#10;https://youtube.com/watch?v=abc&#10;https://tiktok.com/@user/video/456"
          />
        </div>

        {urls.length > 0 && (
          <div className="text-sm">
            <span className="text-green-600">{validUrls.length} valid</span>
            {invalidUrls.length > 0 && (
              <span className="ml-2 text-red-600">{invalidUrls.length} invalid</span>
            )}
          </div>
        )}

        <div className="flex gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="grouping"
              checked={!groupAsOne}
              onChange={() => setGroupAsOne(false)}
            />
            1 incident per URL
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="grouping"
              checked={groupAsOne}
              onChange={() => setGroupAsOne(true)}
            />
            Group as 1 incident
          </label>
        </div>

        <div className="flex gap-4">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (optional)"
            className="flex-1 border-b border-neutral-300 bg-transparent py-2 text-sm outline-none focus:border-neutral-900"
          />
          <input
            type="date"
            value={incidentDate}
            onChange={(e) => setIncidentDate(e.target.value)}
            className="border-b border-neutral-300 bg-transparent py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || validUrls.length === 0}
          className="cursor-pointer text-sm text-neutral-500 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : `Create ${groupAsOne ? '1 incident' : `${validUrls.length} incident${validUrls.length !== 1 ? 's' : ''}`}`}
        </button>
      </form>

      {result && (
        <p className="mt-4 text-sm">
          {result.created > 0 && (
            <span className="text-green-600">Created {result.created} incident(s). </span>
          )}
          {result.skipped > 0 && (
            <span className="text-neutral-400">Skipped {result.skipped} existing URL(s).</span>
          )}
        </p>
      )}
    </div>
  )
}
