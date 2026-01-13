import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { desc, eq, isNull } from 'drizzle-orm'
import { toast } from 'sonner'

import type { IncidentStatus } from '@/db/schema'
import { db } from '@/db/index'
import { incidents, videos } from '@/db/schema'
import { detectPlatform } from '@/lib/video-utils'

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
    // Hard delete - cascades to videos and votes via foreign key
    await db.delete(incidents).where(eq(incidents.id, data.id))
    return { success: true }
  })

const addVideo = createServerFn({ method: 'POST' })
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

const updateVideo = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: number; url: string }) => data)
  .handler(async ({ data }) => {
    const platform = detectPlatform(data.url)
    await db
      .update(videos)
      .set({ url: data.url, platform })
      .where(eq(videos.id, data.id))
    return { success: true }
  })

const deleteVideo = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    await db.delete(videos).where(eq(videos.id, data.id))
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
  const [videoUrls, setVideoUrls] = useState<Record<number, string>>({})
  const [newVideoUrl, setNewVideoUrl] = useState('')

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
    setVideoUrls(
      incident.videos.reduce(
        (acc, v) => ({ ...acc, [v.id]: v.url }),
        {} as Record<number, string>,
      ),
    )
    setNewVideoUrl('')
  }

  const handleUpdateVideo = async (videoId: number, originalUrl: string) => {
    const newUrl = videoUrls[videoId]
    if (newUrl && newUrl !== originalUrl) {
      await updateVideo({ data: { id: videoId, url: newUrl } })
      router.invalidate()
      toast.success('Video updated')
    }
  }

  const handleAddVideo = async (incidentId: number) => {
    if (!newVideoUrl.trim()) return
    await addVideo({ data: { incidentId, url: newVideoUrl.trim() } })
    setNewVideoUrl('')
    router.invalidate()
    toast.success('Video added')
  }

  const handleDeleteVideo = async (videoId: number) => {
    await deleteVideo({ data: { id: videoId } })
    router.invalidate()
    toast.success('Video deleted')
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
    toast.success('Saved')
  }

  const handleToggleStatus = async (
    id: number,
    currentStatus: IncidentStatus,
  ) => {
    const result = await toggleIncidentStatus({ data: { id, currentStatus } })
    router.invalidate()
    toast.success(result.newStatus === 'approved' ? 'Approved' : 'Hidden')
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this incident?')) return
    await deleteIncident({ data: { id } })
    router.invalidate()
    toast.success('Deleted')
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
              <th className="py-2 font-normal">Reports</th>
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
                <td className="py-3">
                  {editingId === incident.id ? (
                    <div className="space-y-1">
                      {incident.videos.map((video) => (
                        <div key={video.id} className="flex items-center gap-1">
                          <input
                            type="text"
                            value={videoUrls[video.id] ?? video.url}
                            onChange={(e) =>
                              setVideoUrls((prev) => ({
                                ...prev,
                                [video.id]: e.target.value,
                              }))
                            }
                            onBlur={() => handleUpdateVideo(video.id, video.url)}
                            className="w-48 border-b border-neutral-300 bg-transparent py-1 text-xs outline-none"
                          />
                          <button
                            onClick={() => handleDeleteVideo(video.id)}
                            className="cursor-pointer text-xs text-red-400 hover:text-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={newVideoUrl}
                          onChange={(e) => setNewVideoUrl(e.target.value)}
                          placeholder="Add video URL"
                          className="w-48 border-b border-neutral-300 bg-transparent py-1 text-xs outline-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddVideo(incident.id)
                            }
                          }}
                        />
                        <button
                          onClick={() => handleAddVideo(incident.id)}
                          className="cursor-pointer text-xs text-neutral-400 hover:text-neutral-900"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ) : (
                    incident.videos.length
                  )}
                </td>
                <td className="py-3 text-neutral-400">
                  {incident.unjustifiedCount + incident.justifiedCount}
                </td>
                <td className="py-3">
                  {incident.reportCount > 0 ? (
                    <span className="text-red-500">{incident.reportCount}</span>
                  ) : (
                    <span className="text-neutral-300">0</span>
                  )}
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
