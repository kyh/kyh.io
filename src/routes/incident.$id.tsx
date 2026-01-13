import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { eq, sql } from 'drizzle-orm'
import { toast } from 'sonner'

import { IncidentCardContent } from '@/components/IncidentCardContent'
import {
  KeyboardShortcutsProvider,
  useKeyboardShortcuts,
} from '@/components/KeyboardShortcutsProvider'
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
          isNullOp(incidents.deletedAt),
        ),
    })
    return incident ?? null
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

const getUserVote = createServerFn({ method: 'GET' })
  .inputValidator((data: { sessionId: string; incidentId: number }) => data)
  .handler(async ({ data }) => {
    if (!data.sessionId) return null

    const vote = await db.query.votes.findFirst({
      where: (votes, { and, eq: eqOp }) =>
        and(
          eqOp(votes.sessionId, data.sessionId),
          eqOp(votes.incidentId, data.incidentId),
        ),
    })

    return vote?.type ?? null
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
  const [userVote, setUserVote] = useState<'unjustified' | 'justified' | null>(
    null,
  )
  const [counts, setCounts] = useState({
    unjustified: incident.unjustifiedCount,
    justified: incident.justifiedCount,
  })
  const [reported, setReported] = useState(false)

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
    async (type: 'unjustified' | 'justified') => {
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
          unjustified: prev.unjustified + (type === 'unjustified' ? 1 : -1),
          justified: prev.justified + (type === 'justified' ? 1 : -1),
        }))
      } else {
        // New vote
        setUserVote(type)
        setCounts((prev) => ({ ...prev, [type]: prev[type] + 1 }))
      }

      // Server request
      const result = await submitVote({
        data: { incidentId: incident.id, type },
      })

      // Rollback on failure
      if (!result.success) {
        setUserVote(prevVote)
        setCounts(prevCounts)
        toast.error('Failed to vote')
      }
    },
    [incident.id, userVote, counts],
  )

  const handleReport = useCallback(async () => {
    await reportIncident({ data: { incidentId: incident.id } })
    setReported(true)
    toast.success('Reported')
  }, [incident.id])

  return (
    <KeyboardShortcutsProvider>
      <div className="min-h-screen bg-white px-4 py-8 sm:px-6">
        <div className="max-w-xl">
          <header className="mb-12">
            <Link
              to="/"
              className="text-sm text-neutral-400 hover:text-neutral-900"
            >
              ← Back
            </Link>
          </header>

          <IncidentArticle incidentId={incident.id}>
            <IncidentCardContent
              incidentId={incident.id}
              location={incident.location}
              incidentDate={incident.incidentDate}
              createdAt={incident.createdAt}
              videos={incident.videos}
              unjustifiedCount={counts.unjustified}
              justifiedCount={counts.justified}
              userVote={userVote}
              onVote={handleVote}
              onReport={handleReport}
              reported={reported}
            />
          </IncidentArticle>
        </div>
      </div>
    </KeyboardShortcutsProvider>
  )
}

function IncidentArticle({
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

  return <article ref={ref}>{children}</article>
}
