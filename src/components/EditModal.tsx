import { useState } from 'react'
import { toast } from 'sonner'

import type { VideoPlatform } from '@/db/schema'
import { isValidVideoUrl } from '@/lib/video-utils'

interface Video {
  id: number
  url: string
  platform: VideoPlatform
}

interface EditModalProps {
  isOpen: boolean
  incidentId: number
  location: string | null
  incidentDate: Date | null
  videos: Array<Video>
  onClose: () => void
  onAddVideo: (url: string) => Promise<void>
  onUpdate: (data: {
    location?: string
    incidentDate?: string
  }) => Promise<void>
}

export function EditModal({
  isOpen,
  incidentId,
  location: initialLocation,
  incidentDate: initialDate,
  videos,
  onClose,
  onAddVideo,
  onUpdate,
}: EditModalProps) {
  const [location, setLocation] = useState(initialLocation || '')
  const [incidentDate, setIncidentDate] = useState(
    initialDate ? new Date(initialDate).toISOString().split('T')[0] : '',
  )
  const [newUrl, setNewUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleAddVideo = async () => {
    if (!newUrl.trim()) return

    if (!isValidVideoUrl(newUrl)) {
      setError('Use a supported platform link')
      return
    }

    setIsSubmitting(true)
    setError('')
    try {
      await onAddVideo(newUrl.trim())
      setNewUrl('')
      toast.success('Video added')
    } catch {
      toast.error('Failed to add video')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      await onUpdate({
        location: location.trim() || undefined,
        incidentDate: incidentDate || undefined,
      })
      toast.success('Saved')
      onClose()
    } catch {
      toast.error('Failed to save')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setNewUrl('')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 p-4 pt-[15vh]"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="w-full max-w-md bg-white p-6 shadow-lg">
        <div className="mb-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Los Angeles, CA"
              className="w-full border-b border-neutral-300 bg-transparent py-1 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm">Date</label>
            <input
              type="date"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              className="w-full border-b border-neutral-300 bg-transparent py-1 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm text-neutral-500">
            Videos ({videos.length})
          </label>
          <div className="space-y-1">
            {videos.map((video) => (
              <div key={video.id} className="truncate text-xs text-neutral-400">
                {video.platform}: {video.url}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm">Add Video</label>
          <input
            type="url"
            value={newUrl}
            onChange={(e) => {
              setNewUrl(e.target.value)
              setError('')
            }}
            placeholder="https://x.com/..."
            className="w-full border-b border-neutral-300 bg-transparent py-1 text-sm focus:border-neutral-900 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddVideo()
              }
            }}
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          {newUrl.trim() && (
            <button
              onClick={handleAddVideo}
              disabled={isSubmitting}
              className="mt-2 cursor-pointer text-sm text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
            >
              + Add
            </button>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="cursor-pointer text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-900 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleClose}
            className="cursor-pointer text-sm text-neutral-400 hover:text-neutral-900"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
