import { useCallback, useEffect, useState } from 'react'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { eq, sql } from 'drizzle-orm'

import { VideoEmbed } from '@/components/VideoEmbed'
import { db } from '@/db/index'
import { incidents, votes } from '@/db/schema'
import { auth } from '@/lib/auth'
import { authClient } from '@/lib/auth-client'

const getIncident = createServerFn({ method: 'GET' })
  .inputValidator((id: number) => id)
  .handler(async ({ data: id }) => {
    const incident = await db.query.incidents.findFirst({
      with: { videos: true },
      where: (incidents, { and, eq: eqOp, isNull: isNullOp }) =>
        and(
          eqOp(incidents.id, id),
          eqOp(incidents.status, 'approved'),
          isNullOp(incidents.deletedAt)
        ),
    })
    return incident ?? null
  })

const submitVote = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { incidentId: number; type: 'angry' | 'meh' }) => data
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
          eqOp(votes.incidentId, data.incidentId)
        ),
    })

    // Toggle: if same vote type, remove it
    if (existing?.type === data.type) {
      await db.delete(votes).where(eq(votes.id, existing.id))
      const field = data.type === 'angry' ? 'angryCount' : 'mehCount'
      await db
        .update(incidents)
        .set({ [field]: sql`${incidents[field]} - 1` })
        .where(eq(incidents.id, data.incidentId))
      return { success: true, action: 'removed' as const }
    }

    // If different vote type exists, switch it
    if (existing) {
      const oldField = existing.type === 'angry' ? 'angryCount' : 'mehCount'
      const newField = data.type === 'angry' ? 'angryCount' : 'mehCount'
      await db.update(votes).set({ type: data.type }).where(eq(votes.id, existing.id))
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

    const field = data.type === 'angry' ? 'angryCount' : 'mehCount'
    await db
      .update(incidents)
      .set({ [field]: sql`${incidents[field]} + 1` })
      .where(eq(incidents.id, data.incidentId))

    return { success: true, action: 'added' as const }
  })

const getUserVote = createServerFn({ method: 'GET' })
  .inputValidator((data: { sessionId: string; incidentId: number }) => data)
  .handler(async ({ data }) => {
    if (!data.sessionId) return null

    const vote = await db.query.votes.findFirst({
      where: (votes, { and, eq: eqOp }) =>
        and(
          eqOp(votes.sessionId, data.sessionId),
          eqOp(votes.incidentId, data.incidentId)
        ),
    })

    return vote?.type ?? null
  })

export const Route = createFileRoute('/incident/$id')({
  component: IncidentDetail,
  loader: async ({ params }) => {
    const incident = await getIncident({ data: parseInt(params.id, 10) })
    if (!incident) throw notFound()
    return incident
  },
})

function IncidentDetail() {
  const incident = Route.useLoaderData()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [userVote, setUserVote] = useState<'angry' | 'meh' | null>(null)
  const [counts, setCounts] = useState({
    angry: incident.angryCount,
    meh: incident.mehCount,
  })

  useEffect(() => {
    const initSession = async () => {
      let session = await authClient.getSession()
      if (!session.data) {
        await authClient.signIn.anonymous()
        session = await authClient.getSession()
      }
      if (session.data?.user?.id) {
        setSessionId(session.data.user.id)
      }
    }
    initSession()
  }, [])

  useEffect(() => {
    if (!sessionId) return

    const loadVote = async () => {
      const voteType = await getUserVote({
        data: { sessionId, incidentId: incident.id },
      })
      setUserVote(voteType)
    }
    loadVote()
  }, [sessionId, incident.id])

  const handleVote = useCallback(
    async (type: 'angry' | 'meh') => {
      const prevVote = userVote
      const prevCounts = { ...counts }

      // Optimistic update
      if (prevVote === type) {
        // Removing vote
        setUserVote(null)
        setCounts((prev) => ({ ...prev, [type]: prev[type] - 1 }))
      } else if (prevVote) {
        // Switching vote
        setUserVote(type)
        setCounts((prev) => ({
          angry: prev.angry + (type === 'angry' ? 1 : -1),
          meh: prev.meh + (type === 'meh' ? 1 : -1),
        }))
      } else {
        // New vote
        setUserVote(type)
        setCounts((prev) => ({ ...prev, [type]: prev[type] + 1 }))
      }

      // Server request
      const result = await submitVote({ data: { incidentId: incident.id, type } })

      // Rollback on failure
      if (!result.success) {
        setUserVote(prevVote)
        setCounts(prevCounts)
      }
    },
    [incident.id, userVote, counts]
  )

  const displayDate = incident.incidentDate ?? incident.createdAt
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
          <Link to="/" className="text-sm text-neutral-400 hover:text-neutral-900">
            ← Back
          </Link>
        </header>

        <article>
          <div className="mb-3 text-sm text-neutral-500">
            {incident.location && <>{incident.location}</>}
            {incident.location && displayDate && <> · </>}
            {displayDate && formatDate(displayDate)}
          </div>

          <div className="space-y-3">
            {incident.videos.map((video) => (
              <VideoEmbed key={video.id} url={video.url} platform={video.platform} />
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleVote('angry')}
                className={`cursor-pointer ${userVote === 'angry' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-900'}`}
              >
                outraged ({counts.angry})
              </button>
              <button
                onClick={() => handleVote('meh')}
                className={`cursor-pointer ${userVote === 'meh' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-900'}`}
              >
                meh ({counts.meh})
              </button>
            </div>
            <div className="flex items-center gap-3">
              {incident.videos.map((video) => (
                <a
                  key={video.id}
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-neutral-400 hover:text-neutral-900"
                >
                  open on {video.platform === 'twitter' ? 'x' : video.platform}
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}
