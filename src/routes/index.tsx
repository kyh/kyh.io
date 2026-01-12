import { useCallback, useEffect, useRef, useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { createServerFn, getWebRequest } from '@tanstack/react-start'
import { desc, eq, sql } from 'drizzle-orm'

import { SubmitModal } from '@/components/SubmitModal'
import { VideoEmbed } from '@/components/VideoEmbed'
import { db } from '@/db/index'
import { incidents, videos, votes } from '@/db/schema'
import { auth } from '@/lib/auth'
import { authClient } from '@/lib/auth-client'
import { detectPlatform } from '@/lib/video-utils'

const getIncidents = createServerFn({ method: 'GET' })
  .inputValidator((data: { cursor?: number; limit?: number }) => data)
  .handler(async ({ data }) => {
    const limit = data.limit ?? 10
    const results = await db.query.incidents.findMany({
      with: { videos: true },
      where: data.cursor
        ? (incidents, { and, lt: ltOp, eq: eqOp }) =>
            and(eqOp(incidents.status, 'approved'), ltOp(incidents.id, data.cursor!))
        : (incidents, { eq: eqOp }) => eqOp(incidents.status, 'approved'),
      orderBy: [desc(incidents.createdAt)],
      limit: limit + 1,
    })
    const hasMore = results.length > limit
    return {
      incidents: results.slice(0, limit),
      nextCursor: hasMore ? results[limit - 1].id : undefined,
    }
  })

const getUserVotes = createServerFn({ method: 'GET' })
  .inputValidator((data: { sessionId: string; incidentIds: number[] }) => data)
  .handler(async ({ data }) => {
    if (!data.sessionId || data.incidentIds.length === 0) return {}

    const userVotes = await db.query.votes.findMany({
      where: (votes, { and, eq: eqOp, inArray }) =>
        and(
          eqOp(votes.sessionId, data.sessionId),
          inArray(votes.incidentId, data.incidentIds)
        ),
    })

    return userVotes.reduce(
      (acc, vote) => {
        acc[vote.incidentId] = vote.type
        return acc
      },
      {} as Record<number, 'angry' | 'meh'>
    )
  })

const createIncident = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { location?: string; incidentDate?: string; videoUrls: string[] }) => data
  )
  .handler(async ({ data }) => {
    const isDev = process.env.NODE_ENV === 'development'

    const existingVideos = await db.query.videos.findMany({
      where: (videos, { inArray }) => inArray(videos.url, data.videoUrls),
      with: { incident: true },
    })

    if (existingVideos.length > 0) {
      const existingIncident = existingVideos[0].incident
      const existingUrls = new Set(existingVideos.map((v) => v.url))
      const newUrls = data.videoUrls.filter((url) => !existingUrls.has(url))

      if (newUrls.length > 0) {
        await db.insert(videos).values(
          newUrls.map((url) => ({
            incidentId: existingIncident.id,
            url,
            platform: detectPlatform(url),
          }))
        )
      }

      return {
        incident: existingIncident,
        autoApproved: existingIncident.status === 'approved',
        merged: true,
      }
    }

    const [incident] = await db
      .insert(incidents)
      .values({
        location: data.location,
        incidentDate: data.incidentDate ? new Date(data.incidentDate) : null,
        status: isDev ? 'approved' : 'pending',
      })
      .returning()

    await db.insert(videos).values(
      data.videoUrls.map((url) => ({
        incidentId: incident.id,
        url,
        platform: detectPlatform(url),
      }))
    )

    return { incident, autoApproved: isDev, merged: false }
  })

const submitVote = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { incidentId: number; type: 'angry' | 'meh' }) => data
  )
  .handler(async ({ data }) => {
    const request = getWebRequest()
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user?.id) {
      return { success: false, error: 'No session' }
    }

    const sessionId = session.user.id

    const existing = await db.query.votes.findFirst({
      where: (votes, { and, eq: eqOp }) =>
        and(
          eqOp(votes.sessionId, sessionId),
          eqOp(votes.incidentId, data.incidentId)
        ),
    })

    if (existing) return { success: false, error: 'Already voted' }

    await db.insert(votes).values({
      incidentId: data.incidentId,
      sessionId,
      type: data.type,
    })

    const field = data.type === 'angry' ? 'angryCount' : 'mehCount'
    await db
      .update(incidents)
      .set({ [field]: sql`${incidents[field]} + 1` })
      .where(eq(incidents.id, data.incidentId))

    return { success: true }
  })

export const Route = createFileRoute('/')(({
  component: IncidentFeed,
  loader: () => getIncidents({ data: {} }),
}))

function IncidentFeed() {
  const router = useRouter()
  const loaderData = Route.useLoaderData()

  const [extraIncidents, setExtraIncidents] = useState<typeof loaderData.incidents>([])
  const [nextCursor, setNextCursor] = useState(loaderData.nextCursor)
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [userVotes, setUserVotes] = useState<Record<number, 'angry' | 'meh'>>({})
  const [voteCounts, setVoteCounts] = useState<Record<number, { angry: number; meh: number }>>({})

  const loadMoreRef = useRef<HTMLDivElement>(null)

  const allIncidents = [...loaderData.incidents, ...extraIncidents]
  const incidentIdsKey = allIncidents.map((i) => i.id).join(',')

  const loaderKey = loaderData.incidents.map((i) => i.id).join(',')
  useEffect(() => {
    setExtraIncidents([])
    setNextCursor(loaderData.nextCursor)
  }, [loaderKey, loaderData.nextCursor])

  useEffect(() => {
    const initAndLoadVotes = async () => {
      try {
        let session = await authClient.getSession()
        if (!session.data) {
          await authClient.signIn.anonymous()
          session = await authClient.getSession()
        }
        const userId = session.data?.user?.id
        if (userId) {
          setSessionId(userId)
          if (allIncidents.length > 0) {
            const votes = await getUserVotes({
              data: { sessionId: userId, incidentIds: allIncidents.map((i) => i.id) },
            })
            setUserVotes(votes)
          }
        }
      } catch (error) {
        console.error('Auth init error:', error)
      }
    }
    initAndLoadVotes()
  }, [incidentIdsKey])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !isLoading) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [nextCursor, isLoading])

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoading) return
    setIsLoading(true)
    try {
      const result = await getIncidents({ data: { cursor: nextCursor } })
      setExtraIncidents((prev) => [...prev, ...result.incidents])
      setNextCursor(result.nextCursor)

      if (sessionId && result.incidents.length > 0) {
        const newIds = result.incidents.map((i) => i.id)
        const newVotes = await getUserVotes({ data: { sessionId, incidentIds: newIds } })
        setUserVotes((prev) => ({ ...prev, ...newVotes }))
      }
    } finally {
      setIsLoading(false)
    }
  }, [nextCursor, isLoading, sessionId])

  const handleVote = useCallback(
    async (incidentId: number, type: 'angry' | 'meh') => {
      if (userVotes[incidentId]) return

      const result = await submitVote({ data: { incidentId, type } })
      if (result.success) {
        setUserVotes((prev) => ({ ...prev, [incidentId]: type }))
        setVoteCounts((prev) => ({
          ...prev,
          [incidentId]: {
            angry: (prev[incidentId]?.angry ?? 0) + (type === 'angry' ? 1 : 0),
            meh: (prev[incidentId]?.meh ?? 0) + (type === 'meh' ? 1 : 0),
          },
        }))
      }
    },
    [userVotes]
  )

  const getVoteCount = (incident: (typeof allIncidents)[0], type: 'angry' | 'meh') => {
    const base = type === 'angry' ? incident.angryCount : incident.mehCount
    const extra = voteCounts[incident.id]?.[type] ?? 0
    return base + extra
  }

  const handleSubmit = useCallback(
    async (data: { location?: string; incidentDate?: string; videoUrls: string[] }) => {
      const result = await createIncident({ data })
      if (result.autoApproved) {
        router.invalidate()
      }
      return { autoApproved: result.autoApproved, merged: result.merged }
    },
    [router]
  )

  const formatDate = (date: Date | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-white px-4 py-8 sm:px-6">
      <div className="max-w-xl">
        <header className="mb-12">
          <h1 className="text-base font-normal">Policing ICE</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Documenting incidents of ICE overreach.{' '}
            <button
              onClick={() => setIsModalOpen(true)}
              className="cursor-pointer text-neutral-500 underline underline-offset-2 hover:text-neutral-900"
            >
              Submit
            </button>
          </p>
        </header>

        {allIncidents.length === 0 ? (
          <p className="text-sm text-neutral-500">No incidents yet.</p>
        ) : (
          <div className="divide-y divide-neutral-200">
            {allIncidents.map((incident) => {
              const displayDate = incident.incidentDate ?? incident.createdAt
              const angryCount = getVoteCount(incident, 'angry')
              const mehCount = getVoteCount(incident, 'meh')
              const userVote = userVotes[incident.id]

              return (
                <article key={incident.id} className="py-6 first:pt-0">
                  <div className="mb-3 flex items-baseline justify-between text-sm text-neutral-500">
                    <span>
                      {incident.location && <>{incident.location}</>}
                      {incident.location && displayDate && <> · </>}
                      {displayDate && formatDate(displayDate)}
                    </span>
                    <Link
                      to="/incident/$id"
                      params={{ id: String(incident.id) }}
                      className="text-neutral-400 hover:text-neutral-900"
                    >
                      #{incident.id}
                    </Link>
                  </div>

                  <div className="space-y-3">
                    {incident.videos.map((video) => (
                      <VideoEmbed key={video.id} url={video.url} platform={video.platform} />
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleVote(incident.id, 'angry')}
                        disabled={!!userVote}
                        className={userVote === 'angry' ? 'text-neutral-900' : userVote ? 'text-neutral-400' : 'cursor-pointer text-neutral-400 hover:text-neutral-900'}
                      >
                        outraged ({angryCount})
                      </button>
                      <button
                        onClick={() => handleVote(incident.id, 'meh')}
                        disabled={!!userVote}
                        className={userVote === 'meh' ? 'text-neutral-900' : userVote ? 'text-neutral-400' : 'cursor-pointer text-neutral-400 hover:text-neutral-900'}
                      >
                        meh ({mehCount})
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      {incident.videos.map((video) => (
                        <a
                          key={video.id}
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-neutral-400 hover:text-neutral-900"
                        >
                          open on {video.platform === 'twitter' ? 'x' : video.platform}
                        </a>
                      ))}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        <div ref={loadMoreRef} className="py-8">
          {isLoading && <span className="text-sm text-neutral-400">Loading...</span>}
          {!nextCursor && allIncidents.length > 0 && (
            <span className="text-sm text-neutral-300">—</span>
          )}
        </div>
      </div>

      <SubmitModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
