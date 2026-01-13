import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { desc, eq, sql } from 'drizzle-orm'
import { toast } from 'sonner'

import { EditModal } from '@/components/EditModal'
import {
  KeyboardShortcutsProvider,
  useKeyboardShortcuts,
} from '@/components/KeyboardShortcutsProvider'
import { SubmitModal } from '@/components/SubmitModal'
import { VideoCarousel } from '@/components/VideoCarousel'
import { db } from '@/db/index'
import { incidents, videos, votes } from '@/db/schema'
import { auth } from '@/lib/auth'
import { authClient } from '@/lib/auth-client'
import { detectPlatform } from '@/lib/video-utils'

// Parse date string as local time (not UTC)
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const getIncidents = createServerFn({ method: 'GET' })
  .inputValidator((data: { cursor?: number; limit?: number }) => data)
  .handler(async ({ data }) => {
    const limit = data.limit ?? 10
    const results = await db.query.incidents.findMany({
      with: { videos: true },
      where: (
        incidents,
        { and: andOp, lt: ltOp, eq: eqOp, isNull: isNullOp },
      ) =>
        data.cursor
          ? andOp(
              eqOp(incidents.status, 'approved'),
              isNullOp(incidents.deletedAt),
              ltOp(incidents.id, data.cursor),
            )
          : andOp(
              eqOp(incidents.status, 'approved'),
              isNullOp(incidents.deletedAt),
            ),
      // Order by incident_date desc, nulls first (treated as today)
      orderBy: [
        desc(sql`COALESCE(${incidents.incidentDate}, ${Math.floor(Date.now() / 1000)})`),
      ],
      limit: limit + 1,
    })
    const hasMore = results.length > limit
    return {
      incidents: results.slice(0, limit),
      nextCursor: hasMore ? results[limit - 1].id : undefined,
    }
  })

const getUserVotes = createServerFn({ method: 'GET' })
  .inputValidator((data: { sessionId: string; incidentIds: Array<number> }) => data)
  .handler(async ({ data }) => {
    if (!data.sessionId || data.incidentIds.length === 0) return {}

    const userVotes = await db.query.votes.findMany({
      where: (votes, { and, eq: eqOp, inArray }) =>
        and(
          eqOp(votes.sessionId, data.sessionId),
          inArray(votes.incidentId, data.incidentIds),
        ),
    })

    return userVotes.reduce(
      (acc, vote) => {
        acc[vote.incidentId] = vote.type
        return acc
      },
      {} as Record<number, 'unjustified' | 'justified'>,
    )
  })

const createIncident = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { location?: string; incidentDate?: string; videoUrls: Array<string> }) =>
      data,
  )
  .handler(async ({ data }) => {
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
          })),
        )
      }

      return {
        incident: existingIncident,
        autoApproved: true,
        merged: true,
      }
    }

    const [incident] = await db
      .insert(incidents)
      .values({
        location: data.location,
        incidentDate: data.incidentDate ? parseLocalDate(data.incidentDate) : null,
        status: 'approved',
      })
      .returning()

    await db.insert(videos).values(
      data.videoUrls.map((url) => ({
        incidentId: incident.id,
        url,
        platform: detectPlatform(url),
      })),
    )

    return { incident, autoApproved: true, merged: false }
  })

const submitVote = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { incidentId: number; type: 'unjustified' | 'justified' }) => data,
  )
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    if (!session?.user?.id) {
      return { success: false, error: 'No session' }
    }

    const sessionId = session.user.id

    const existing = await db.query.votes.findFirst({
      where: (votes, { and, eq: eqOp }) =>
        and(
          eqOp(votes.sessionId, sessionId),
          eqOp(votes.incidentId, data.incidentId),
        ),
    })

    // Toggle: if same vote type, remove it
    if (existing?.type === data.type) {
      await db.delete(votes).where(eq(votes.id, existing.id))
      const field =
        data.type === 'unjustified' ? 'unjustifiedCount' : 'justifiedCount'
      await db
        .update(incidents)
        .set({ [field]: sql`${incidents[field]} - 1` })
        .where(eq(incidents.id, data.incidentId))
      return { success: true, action: 'removed' as const }
    }

    // If different vote type exists, switch it
    if (existing) {
      const oldField =
        existing.type === 'unjustified' ? 'unjustifiedCount' : 'justifiedCount'
      const newField =
        data.type === 'unjustified' ? 'unjustifiedCount' : 'justifiedCount'
      await db
        .update(votes)
        .set({ type: data.type })
        .where(eq(votes.id, existing.id))
      await db
        .update(incidents)
        .set({
          [oldField]: sql`${incidents[oldField]} - 1`,
          [newField]: sql`${incidents[newField]} + 1`,
        })
        .where(eq(incidents.id, data.incidentId))
      return { success: true, action: 'switched' as const }
    }

    // New vote
    await db.insert(votes).values({
      incidentId: data.incidentId,
      sessionId,
      type: data.type,
    })

    const field =
      data.type === 'unjustified' ? 'unjustifiedCount' : 'justifiedCount'
    await db
      .update(incidents)
      .set({ [field]: sql`${incidents[field]} + 1` })
      .where(eq(incidents.id, data.incidentId))

    return { success: true, action: 'added' as const }
  })

const reportIncident = createServerFn({ method: 'POST' })
  .inputValidator((data: { incidentId: number }) => data)
  .handler(async ({ data }) => {
    await db
      .update(incidents)
      .set({ reportCount: sql`${incidents.reportCount} + 1` })
      .where(eq(incidents.id, data.incidentId))
    return { success: true }
  })

const addVideoToIncident = createServerFn({ method: 'POST' })
  .inputValidator((data: { incidentId: number; url: string }) => data)
  .handler(async ({ data }) => {
    const platform = detectPlatform(data.url)
    await db.insert(videos).values({
      incidentId: data.incidentId,
      url: data.url,
      platform,
    })
    return { success: true }
  })

const updateIncidentDetails = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { incidentId: number; location?: string; incidentDate?: string }) => data
  )
  .handler(async ({ data }) => {
    await db
      .update(incidents)
      .set({
        location: data.location ?? null,
        incidentDate: data.incidentDate ? parseLocalDate(data.incidentDate) : null,
      })
      .where(eq(incidents.id, data.incidentId))
    return { success: true }
  })

export const Route = createFileRoute('/')({
  component: IncidentFeed,
  loader: () => getIncidents({ data: {} }),
})

function IncidentFeed() {
  const router = useRouter()
  const loaderData = Route.useLoaderData()

  const [extraIncidents, setExtraIncidents] = useState<
    typeof loaderData.incidents
  >([])
  const [nextCursor, setNextCursor] = useState(loaderData.nextCursor)
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [userVotes, setUserVotes] = useState<
    Record<number, 'unjustified' | 'justified'>
  >({})
  const [voteCounts, setVoteCounts] = useState<
    Record<number, { unjustified: number; justified: number }>
  >({})
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [editingIncident, setEditingIncident] = useState<
    (typeof loaderData.incidents)[0] | null
  >(null)
  const [currentSlides, setCurrentSlides] = useState<Record<number, number>>({})

  const loadMoreRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

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
              data: {
                sessionId: userId,
                incidentIds: allIncidents.map((i) => i.id),
              },
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
      { threshold: 0.1 },
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [nextCursor, isLoading])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoading) return
    setIsLoading(true)
    try {
      const result = await getIncidents({ data: { cursor: nextCursor } })
      setExtraIncidents((prev) => [...prev, ...result.incidents])
      setNextCursor(result.nextCursor)

      if (sessionId && result.incidents.length > 0) {
        const newIds = result.incidents.map((i) => i.id)
        const newVotes = await getUserVotes({
          data: { sessionId, incidentIds: newIds },
        })
        setUserVotes((prev) => ({ ...prev, ...newVotes }))
      }
    } finally {
      setIsLoading(false)
    }
  }, [nextCursor, isLoading, sessionId])

  const handleVote = useCallback(
    async (incidentId: number, type: 'unjustified' | 'justified') => {
      const prevVote = userVotes[incidentId]
      const prevCounts = voteCounts[incidentId]

      // Optimistic update
      if (prevVote === type) {
        // Removing vote
        setUserVotes((prev) => {
          const next = { ...prev }
          delete next[incidentId]
          return next
        })
        setVoteCounts((prev) => ({
          ...prev,
          [incidentId]: {
            unjustified:
              (prev[incidentId]?.unjustified ?? 0) -
              (type === 'unjustified' ? 1 : 0),
            justified:
              (prev[incidentId]?.justified ?? 0) -
              (type === 'justified' ? 1 : 0),
          },
        }))
      } else if (prevVote) {
        // Switching vote
        setUserVotes((prev) => ({ ...prev, [incidentId]: type }))
        setVoteCounts((prev) => ({
          ...prev,
          [incidentId]: {
            unjustified:
              (prev[incidentId]?.unjustified ?? 0) +
              (type === 'unjustified' ? 1 : -1),
            justified:
              (prev[incidentId]?.justified ?? 0) +
              (type === 'justified' ? 1 : -1),
          },
        }))
      } else {
        // New vote
        setUserVotes((prev) => ({ ...prev, [incidentId]: type }))
        setVoteCounts((prev) => ({
          ...prev,
          [incidentId]: {
            unjustified:
              (prev[incidentId]?.unjustified ?? 0) +
              (type === 'unjustified' ? 1 : 0),
            justified:
              (prev[incidentId]?.justified ?? 0) +
              (type === 'justified' ? 1 : 0),
          },
        }))
      }

      // Server request
      const result = await submitVote({ data: { incidentId, type } })

      // Rollback on failure
      if (!result.success) {
        if (prevVote) {
          setUserVotes((prev) => ({ ...prev, [incidentId]: prevVote }))
        } else {
          setUserVotes((prev) => {
            const next = { ...prev }
            delete next[incidentId]
            return next
          })
        }
        setVoteCounts((prev) => ({
          ...prev,
          [incidentId]: prevCounts ?? { unjustified: 0, justified: 0 },
        }))
        toast.error('Failed to vote')
      }
    },
    [userVotes, voteCounts],
  )

  const getVoteCount = (
    incident: (typeof allIncidents)[0],
    type: 'unjustified' | 'justified',
  ) => {
    const base =
      type === 'unjustified'
        ? incident.unjustifiedCount
        : incident.justifiedCount
    const extra = voteCounts[incident.id]?.[type] ?? 0
    return base + extra
  }

  const handleReport = useCallback(
    async (incidentId: number) => {
      await reportIncident({ data: { incidentId } })
      setOpenMenuId(null)
      toast.success('Reported')
    },
    [],
  )

  const handleAddVideo = useCallback(
    async (url: string) => {
      if (!editingIncident) return
      await addVideoToIncident({ data: { incidentId: editingIncident.id, url } })
      router.invalidate()
    },
    [editingIncident, router],
  )

  const handleUpdateIncident = useCallback(
    async (data: { location?: string; incidentDate?: string }) => {
      if (!editingIncident) return
      await updateIncidentDetails({
        data: { incidentId: editingIncident.id, ...data },
      })
      router.invalidate()
    },
    [editingIncident, router],
  )

  const handleSubmit = useCallback(
    async (data: {
      location?: string
      incidentDate?: string
      videoUrls: Array<string>
    }) => {
      const result = await createIncident({ data })
      if (result.autoApproved) {
        router.invalidate()
      }
      return { autoApproved: result.autoApproved, merged: result.merged }
    },
    [router],
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
    <KeyboardShortcutsProvider>
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
                const unjustifiedCount = getVoteCount(incident, 'unjustified')
                const justifiedCount = getVoteCount(incident, 'justified')
                const userVote = userVotes[incident.id]

                return (
                  <IncidentCard key={incident.id} incidentId={incident.id}>
                    <VideoCarousel
                      videos={incident.videos}
                      incidentId={incident.id}
                      onSlideChange={(index) =>
                        setCurrentSlides((prev) => ({ ...prev, [incident.id]: index }))
                      }
                      header={
                        <span>
                          {incident.location && <>{incident.location}</>}
                          {incident.location && displayDate && <> · </>}
                          {displayDate && formatDate(displayDate)}
                        </span>
                      }
                      headerRight={
                        <div className="relative" ref={openMenuId === incident.id ? menuRef : null}>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === incident.id ? null : incident.id)}
                            className="cursor-pointer text-neutral-400 hover:text-neutral-900"
                          >
                            •••
                          </button>
                          {openMenuId === incident.id && (
                            <div className="absolute right-0 top-6 z-10 min-w-32 rounded border border-neutral-200 bg-white py-1 shadow-sm">
                              <Link
                                to="/incident/$id"
                                params={{ id: String(incident.id) }}
                                className="block px-3 py-1.5 text-left hover:bg-neutral-50"
                                onClick={() => setOpenMenuId(null)}
                              >
                                View
                              </Link>
                              <button
                                onClick={() => {
                                  setEditingIncident(incident)
                                  setOpenMenuId(null)
                                }}
                                className="block w-full cursor-pointer px-3 py-1.5 text-left hover:bg-neutral-50"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleReport(incident.id)}
                                className="block w-full cursor-pointer px-3 py-1.5 text-left text-red-600 hover:bg-neutral-50"
                              >
                                Report
                              </button>
                            </div>
                          )}
                        </div>
                      }
                    />

                    <div className="mt-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleVote(incident.id, 'unjustified')}
                          className={`cursor-pointer ${userVote === 'unjustified' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-900'}`}
                        >
                          unjustified ({unjustifiedCount})
                        </button>
                        <button
                          onClick={() => handleVote(incident.id, 'justified')}
                          className={`cursor-pointer ${userVote === 'justified' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-900'}`}
                        >
                          justified ({justifiedCount})
                        </button>
                      </div>
                      {incident.videos.length > 0 && (() => {
                        const currentVideo = incident.videos[currentSlides[incident.id] ?? 0]
                        return (
                          <a
                            href={currentVideo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-neutral-400 hover:text-neutral-900"
                          >
                            open on{' '}
                            {currentVideo.platform === 'twitter' ? 'x' : currentVideo.platform}
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </a>
                        )
                      })()}
                    </div>
                  </IncidentCard>
                )
              })}
            </div>
          )}

          <div ref={loadMoreRef} className="py-8">
            {isLoading && (
              <span className="text-sm text-neutral-400">Loading...</span>
            )}
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

        {editingIncident && (
          <EditModal
            isOpen={true}
            incidentId={editingIncident.id}
            location={editingIncident.location}
            incidentDate={editingIncident.incidentDate}
            videos={editingIncident.videos}
            onClose={() => setEditingIncident(null)}
            onAddVideo={handleAddVideo}
            onUpdate={handleUpdateIncident}
          />
        )}
      </div>
    </KeyboardShortcutsProvider>
  )
}

function IncidentCard({
  incidentId,
  children,
}: {
  incidentId: number
  children: React.ReactNode
}) {
  const ref = useRef<HTMLElement>(null)
  const shortcuts = useKeyboardShortcuts()

  useEffect(() => {
    if (!shortcuts) return
    shortcuts.registerIncident(incidentId, ref.current)
    return () => shortcuts.unregisterIncident(incidentId)
  }, [incidentId, shortcuts])

  return (
    <article ref={ref} className="py-6 first:pt-0">
      {children}
    </article>
  )
}
