import { useCallback, useEffect, useState } from 'react'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { createServerFn, getWebRequest } from '@tanstack/react-start'
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
      where: (incidents, { and, eq: eqOp }) =>
        and(eqOp(incidents.id, id), eqOp(incidents.status, 'approved')),
    })
    return incident ?? null
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
      if (userVote) return

      const result = await submitVote({ data: { incidentId: incident.id, type } })
      if (result.success) {
        setUserVote(type)
        setCounts((prev) => ({
          ...prev,
          [type]: prev[type] + 1,
        }))
      }
    },
    [userVote, incident.id]
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
                disabled={!!userVote}
                className={userVote === 'angry' ? 'text-neutral-900' : userVote ? 'text-neutral-400' : 'cursor-pointer text-neutral-400 hover:text-neutral-900'}
              >
                outraged ({counts.angry})
              </button>
              <button
                onClick={() => handleVote('meh')}
                disabled={!!userVote}
                className={userVote === 'meh' ? 'text-neutral-900' : userVote ? 'text-neutral-400' : 'cursor-pointer text-neutral-400 hover:text-neutral-900'}
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
                  className="text-neutral-400 hover:text-neutral-900"
                >
                  open on {video.platform === 'twitter' ? 'x' : video.platform}
                </a>
              ))}
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}
