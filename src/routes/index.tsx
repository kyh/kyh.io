import { useCallback, useEffect, useRef, useState } from 'react'
import { Menu } from '@base-ui/react/menu'
import { Popover } from '@base-ui/react/popover'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { and, desc, eq, gte, like, lt, lte, sql } from 'drizzle-orm'
import { MoreHorizontal, Search, X } from 'lucide-react'
import { toast } from 'sonner'

import { EditModal } from '@/components/EditModal'
import { IncidentCardContent } from '@/components/IncidentCardContent'
import {
  KeyboardShortcutsProvider,
  useKeyboardShortcuts,
} from '@/components/KeyboardShortcutsProvider'
import { SubmitModal } from '@/components/SubmitModal'
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
  .inputValidator((data: { offset?: number; limit?: number }) => data)
  .handler(async ({ data }) => {
    const limit = data.limit ?? 10
    const offset = data.offset ?? 0
    const results = await db.query.incidents.findMany({
      with: { videos: true },
      where: (incidents, { and: andOp, eq: eqOp, isNull: isNullOp, lt: ltOp }) =>
        andOp(
          eqOp(incidents.status, 'approved'),
          isNullOp(incidents.deletedAt),
          ltOp(incidents.reportCount, 3),
        ),
      // Order by incident_date desc (nulls first), then id desc for stability
      orderBy: [
        desc(sql`IFNULL(${incidents.incidentDate}, 9999999999)`),
        desc(incidents.id),
      ],
      limit: limit + 1,
      offset,
    })
    const hasMore = results.length > limit
    return {
      incidents: results.slice(0, limit),
      nextOffset: hasMore ? offset + limit : undefined,
    }
  })

const searchIncidents = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      query?: string
      startDate?: string
      endDate?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const conditions = [
      eq(incidents.status, 'approved'),
      sql`${incidents.deletedAt} IS NULL`,
      lt(incidents.reportCount, 3),
    ]

    if (data.query) {
      const q = `%${data.query}%`
      conditions.push(
        sql`(${like(incidents.location, q)} OR ${like(incidents.description, q)})`,
      )
    }

    if (data.startDate) {
      const start = parseLocalDate(data.startDate)
      conditions.push(gte(incidents.incidentDate, start))
    }

    if (data.endDate) {
      const end = parseLocalDate(data.endDate)
      end.setDate(end.getDate() + 1)
      conditions.push(lte(incidents.incidentDate, end))
    }

    const results = await db.query.incidents.findMany({
      with: { videos: true },
      where: and(...conditions),
      orderBy: [
        desc(sql`IFNULL(${incidents.incidentDate}, 9999999999)`),
        desc(incidents.id),
      ],
      limit: 50,
    })

    return { incidents: results }
  })

const getUserVotes = createServerFn({ method: 'GET' })
  .inputValidator((data: { incidentIds: Array<number> }) => data)
  .handler(async ({ data }) => {
    if (data.incidentIds.length === 0) return {}

    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    if (!session?.user?.id) return {}

    const userVotes = await db.query.votes.findMany({
      where: (votes, { and, eq: eqOp, inArray }) =>
        and(
          eqOp(votes.sessionId, session.user.id),
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
    (data: {
      location?: string
      incidentDate?: string
      videoUrls: Array<string>
    }) => data,
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
        incidentDate: data.incidentDate
          ? parseLocalDate(data.incidentDate)
          : new Date(),
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
    (data: { incidentId: number; location?: string; incidentDate?: string }) =>
      data,
  )
  .handler(async ({ data }) => {
    await db
      .update(incidents)
      .set({
        location: data.location ?? null,
        incidentDate: data.incidentDate
          ? parseLocalDate(data.incidentDate)
          : null,
      })
      .where(eq(incidents.id, data.incidentId))
    return { success: true }
  })

export const Route = createFileRoute('/')({
  component: IncidentFeed,
  loader: async () => {
    const { incidents, nextOffset } = await getIncidents({ data: {} })
    const userVotes = await getUserVotes({
      data: { incidentIds: incidents.map((i) => i.id) },
    })
    return { incidents, nextOffset, userVotes }
  },
})

function IncidentFeed() {
  const router = useRouter()
  const loaderData = Route.useLoaderData()

  const [extraIncidents, setExtraIncidents] = useState<
    typeof loaderData.incidents
  >([])
  const [nextOffset, setNextOffset] = useState(loaderData.nextOffset)
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [userVotes, setUserVotes] = useState(loaderData.userVotes)
  const [voteCounts, setVoteCounts] = useState<
    Record<number, { unjustified: number; justified: number }>
  >({})
  const [editingIncident, setEditingIncident] = useState<
    (typeof loaderData.incidents)[0] | null
  >(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchStartDate, setSearchStartDate] = useState('')
  const [searchEndDate, setSearchEndDate] = useState('')
  const [searchResults, setSearchResults] = useState<
    typeof loaderData.incidents | null
  >(null)
  const [isSearching, setIsSearching] = useState(false)

  const loadMoreRef = useRef<HTMLDivElement>(null)
  const allIncidents = [...loaderData.incidents, ...extraIncidents]

  // Reset state when loader data changes (navigation)
  const loaderKey = loaderData.incidents.map((i) => i.id).join(',')
  useEffect(() => {
    setExtraIncidents([])
    setNextOffset(loaderData.nextOffset)
    setUserVotes(loaderData.userVotes)
  }, [loaderKey, loaderData.nextOffset, loaderData.userVotes])

  // Infinite scroll
  useEffect(() => {
    const ref = loadMoreRef.current
    if (!ref) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextOffset && !isLoading) {
          loadMore()
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(ref)
    return () => observer.disconnect()
  }, [nextOffset, isLoading])

  const handleSearch = useCallback(async () => {
    if (!searchQuery && !searchStartDate && !searchEndDate) {
      setSearchResults(null)
      return
    }
    setIsSearching(true)
    try {
      const result = await searchIncidents({
        data: {
          query: searchQuery || undefined,
          startDate: searchStartDate || undefined,
          endDate: searchEndDate || undefined,
        },
      })
      setSearchResults(result.incidents)
      setIsSearchOpen(false)
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, searchStartDate, searchEndDate])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchStartDate('')
    setSearchEndDate('')
    setSearchResults(null)
  }, [])

  const loadMore = useCallback(async () => {
    if (!nextOffset || isLoading) return
    setIsLoading(true)
    try {
      const result = await getIncidents({ data: { offset: nextOffset } })
      setExtraIncidents((prev) => [...prev, ...result.incidents])
      setNextOffset(result.nextOffset)

      if (result.incidents.length > 0) {
        const newVotes = await getUserVotes({
          data: { incidentIds: result.incidents.map((i) => i.id) },
        })
        setUserVotes((prev) => ({ ...prev, ...newVotes }))
      }
    } finally {
      setIsLoading(false)
    }
  }, [nextOffset, isLoading])

  const handleVote = useCallback(
    async (incidentId: number, type: 'unjustified' | 'justified') => {
      // Ensure user has session (creates anonymous if needed)
      let session = await authClient.getSession()
      if (!session.data) {
        await authClient.signIn.anonymous()
      }

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

  const handleReport = useCallback(async (incidentId: number) => {
    await reportIncident({ data: { incidentId } })
    toast.success('Reported')
  }, [])

  const handleAddVideo = useCallback(
    async (url: string) => {
      if (!editingIncident) return
      await addVideoToIncident({
        data: { incidentId: editingIncident.id, url },
      })
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
      toast.success(
        result.merged ? 'Added to existing incident' : 'Added to feed',
      )
    },
    [router],
  )

  return (
    <KeyboardShortcutsProvider>
      <main
        id="main-content"
        className="min-h-screen bg-white px-4 py-8 sm:px-6"
      >
        <div className="max-w-xl">
          <header className="mb-12">
            <div className="flex items-center justify-between">
              <h1 className="text-base font-normal">Policing ICE</h1>
              <Popover.Root
                open={isSearchOpen}
                onOpenChange={setIsSearchOpen}
              >
                <Popover.Trigger
                  className="cursor-pointer text-neutral-400 hover:text-neutral-900"
                  aria-label="Search incidents"
                >
                  <Search className="h-4 w-4" />
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Positioner side="bottom" align="end" sideOffset={8}>
                    <Popover.Popup className="z-20 w-64 rounded border border-neutral-200 bg-white p-4">
                      <div className="space-y-3">
                        <div>
                          <label
                            htmlFor="search-query"
                            className="mb-1 block text-xs text-neutral-500"
                          >
                            Location or description
                          </label>
                          <input
                            id="search-query"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Los Angeles, arrest..."
                            className="w-full border-b border-neutral-300 bg-transparent py-1 text-sm focus:border-neutral-900 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="search-start"
                            className="mb-1 block text-xs text-neutral-500"
                          >
                            From date
                          </label>
                          <input
                            id="search-start"
                            type="date"
                            value={searchStartDate}
                            onChange={(e) => setSearchStartDate(e.target.value)}
                            className="w-full border-b border-neutral-300 bg-transparent py-1 text-sm focus:border-neutral-900 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="search-end"
                            className="mb-1 block text-xs text-neutral-500"
                          >
                            To date
                          </label>
                          <input
                            id="search-end"
                            type="date"
                            value={searchEndDate}
                            onChange={(e) => setSearchEndDate(e.target.value)}
                            className="w-full border-b border-neutral-300 bg-transparent py-1 text-sm focus:border-neutral-900 focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={handleSearch}
                          disabled={isSearching}
                          className="w-full cursor-pointer text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-900 disabled:opacity-50"
                        >
                          {isSearching ? 'Searching...' : 'Search'}
                        </button>
                      </div>
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </Popover.Root>
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              Documenting incidents of ICE overreach.{' '}
              <button
                onClick={() => setIsModalOpen(true)}
                className="cursor-pointer text-neutral-500 underline underline-offset-2 hover:text-neutral-900"
                aria-label="Submit a new incident"
              >
                Submit
              </button>
            </p>
          </header>

          {searchResults !== null && (
            <div className="mb-6 flex items-center gap-2 text-sm">
              <span className="text-neutral-500">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={clearSearch}
                className="inline-flex cursor-pointer items-center gap-1 text-neutral-400 hover:text-neutral-900"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            </div>
          )}

          {(searchResults ?? allIncidents).length === 0 ? (
            <p className="text-sm text-neutral-500">
              {searchResults !== null ? 'No results found.' : 'No incidents yet.'}
            </p>
          ) : (
            <div className="divide-y divide-neutral-200">
              {(searchResults ?? allIncidents).map((incident) => {
                const unjustifiedCount = getVoteCount(incident, 'unjustified')
                const justifiedCount = getVoteCount(incident, 'justified')
                const userVote = userVotes[incident.id]

                return (
                  <IncidentCard key={incident.id} incidentId={incident.id}>
                    <IncidentCardContent
                      incidentId={incident.id}
                      location={incident.location}
                      incidentDate={incident.incidentDate}
                      createdAt={incident.createdAt}
                      videos={incident.videos}
                      unjustifiedCount={unjustifiedCount}
                      justifiedCount={justifiedCount}
                      userVote={userVote}
                      onVote={(type) => handleVote(incident.id, type)}
                      headerRight={
                        <Menu.Root>
                          <Menu.Trigger
                            className="cursor-pointer text-neutral-400 hover:text-neutral-900"
                            aria-label="Incident actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Menu.Trigger>
                          <Menu.Portal>
                            <Menu.Positioner side="bottom" align="end" sideOffset={6}>
                              <Menu.Popup className="z-10 min-w-32 rounded border border-neutral-200 bg-white py-1 text-sm">
                                <Menu.Item
                                  className="block w-full px-3 py-1.5 text-left hover:bg-neutral-50 data-[highlighted]:bg-neutral-50"
                                  render={
                                    <Link
                                      to="/incident/$id"
                                      params={{ id: String(incident.id) }}
                                    />
                                  }
                                >
                                  View
                                </Menu.Item>
                                <Menu.Item
                                  className="block w-full cursor-pointer px-3 py-1.5 text-left hover:bg-neutral-50 data-[highlighted]:bg-neutral-50"
                                  onClick={() => setEditingIncident(incident)}
                                >
                                  Edit
                                </Menu.Item>
                                <Menu.Item
                                  className="block w-full cursor-pointer px-3 py-1.5 text-left text-red-600 hover:bg-neutral-50 data-[highlighted]:bg-neutral-50"
                                  onClick={() => handleReport(incident.id)}
                                >
                                  Report
                                </Menu.Item>
                              </Menu.Popup>
                            </Menu.Positioner>
                          </Menu.Portal>
                        </Menu.Root>
                      }
                    />
                  </IncidentCard>
                )
              })}
            </div>
          )}

          {searchResults === null && (
            <div ref={loadMoreRef} className="py-8">
              {isLoading && (
                <span className="text-sm text-neutral-400">Loading...</span>
              )}
              {!nextOffset && allIncidents.length > 0 && (
                <span className="text-sm text-neutral-300">—</span>
              )}
            </div>
          )}
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
      </main>
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
