import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { desc, eq, isNull } from 'drizzle-orm'

import type { IncidentStatus } from '@/db/schema'
import { db } from '@/db/index'
import { incidents } from '@/db/schema'

const getAllIncidents = createServerFn({ method: 'GET' }).handler(async () => {
  const results = await db.query.incidents.findMany({
    with: { videos: true },
    where: isNull(incidents.deletedAt),
    orderBy: [desc(incidents.createdAt)],
  })
  return results
})

const updateIncident = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: number
      location?: string
      incidentDate?: string
      status?: IncidentStatus
    }) => data,
  )
  .handler(async ({ data }) => {
    await db
      .update(incidents)
      .set({
        location: data.location,
        incidentDate: data.incidentDate ? new Date(data.incidentDate) : null,
        status: data.status,
      })
      .where(eq(incidents.id, data.id))
    return { success: true }
  })

const toggleIncidentStatus = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: number; currentStatus: IncidentStatus }) => data)
  .handler(async ({ data }) => {
    const newStatus = data.currentStatus === 'approved' ? 'hidden' : 'approved'
    await db
      .update(incidents)
      .set({ status: newStatus })
      .where(eq(incidents.id, data.id))
    return { success: true, newStatus }
  })

const deleteIncident = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    await db
      .update(incidents)
      .set({ deletedAt: new Date() })
      .where(eq(incidents.id, data.id))
    return { success: true }
  })

export const Route = createFileRoute('/admin/_layout/incidents')({
  component: AdminIncidents,
  loader: () => getAllIncidents(),
})

function AdminIncidents() {
  const router = useRouter()
  const allIncidents = Route.useLoaderData()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ location: '', incidentDate: '' })

  const formatDate = (date: Date | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleEdit = (incident: (typeof allIncidents)[0]) => {
    setEditingId(incident.id)
    setEditForm({
      location: incident.location || '',
      incidentDate: incident.incidentDate
        ? new Date(incident.incidentDate).toISOString().split('T')[0]
        : '',
    })
  }

  const handleSave = async (id: number) => {
    await updateIncident({
      data: {
        id,
        location: editForm.location || undefined,
        incidentDate: editForm.incidentDate || undefined,
      },
    })
    setEditingId(null)
    router.invalidate()
  }

  const handleToggleStatus = async (
    id: number,
    currentStatus: IncidentStatus,
  ) => {
    await toggleIncidentStatus({ data: { id, currentStatus } })
    router.invalidate()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this incident?')) return
    await deleteIncident({ data: { id } })
    router.invalidate()
  }

  return (
    <div>
      <h2 className="mb-4 text-sm font-medium">
        All Incidents ({allIncidents.length})
      </h2>

      {allIncidents.length === 0 ? (
        <p className="text-sm text-neutral-500">No incidents.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-2 font-normal">ID</th>
              <th className="py-2 font-normal">Location</th>
              <th className="py-2 font-normal">Date</th>
              <th className="py-2 font-normal">Status</th>
              <th className="py-2 font-normal">Videos</th>
              <th className="py-2 font-normal">Votes</th>
              <th className="py-2 font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allIncidents.map((incident) => (
              <tr key={incident.id} className="border-b border-neutral-100">
                <td className="py-3">#{incident.id}</td>
                <td className="py-3">
                  {editingId === incident.id ? (
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, location: e.target.value }))
                      }
                      className="w-full border-b border-neutral-300 bg-transparent py-1 text-sm outline-none"
                      placeholder="Location"
                    />
                  ) : (
                    incident.location || '—'
                  )}
                </td>
                <td className="py-3">
                  {editingId === incident.id ? (
                    <input
                      type="date"
                      value={editForm.incidentDate}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          incidentDate: e.target.value,
                        }))
                      }
                      className="border-b border-neutral-300 bg-transparent py-1 text-sm outline-none"
                    />
                  ) : (
                    formatDate(incident.incidentDate)
                  )}
                </td>
                <td className="py-3">
                  <button
                    onClick={() =>
                      handleToggleStatus(incident.id, incident.status)
                    }
                    className="cursor-pointer"
                  >
                    {incident.status === 'approved' ? (
                      <span className="text-green-600">approved</span>
                    ) : (
                      <span className="text-neutral-400">hidden</span>
                    )}
                  </button>
                </td>
                <td className="py-3">{incident.videos.length}</td>
                <td className="py-3 text-neutral-400">
                  {incident.unjustifiedCount + incident.justifiedCount}
                </td>
                <td className="py-3 text-neutral-400">
                  {editingId === incident.id ? (
                    <>
                      <button
                        onClick={() => handleSave(incident.id)}
                        className="cursor-pointer hover:text-neutral-900"
                      >
                        save
                      </button>
                      {' · '}
                      <button
                        onClick={() => setEditingId(null)}
                        className="cursor-pointer hover:text-neutral-900"
                      >
                        cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEdit(incident)}
                        className="cursor-pointer hover:text-neutral-900"
                      >
                        edit
                      </button>
                      {' · '}
                      <button
                        onClick={() => handleDelete(incident.id)}
                        className="cursor-pointer hover:text-red-600"
                      >
                        delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
