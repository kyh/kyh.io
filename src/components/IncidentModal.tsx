import { useRef, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { toast } from 'sonner'

import type { VideoPlatform } from '@/db/schema'
import { isValidVideoUrl } from '@/lib/video-utils'

interface Video {
  id: number
  url: string
  platform: VideoPlatform
}

interface IncidentData {
  location?: string
  description?: string
  incidentDate?: string
  videoUrls?: Array<string>
}

interface CreateModeProps {
  mode: 'create'
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: IncidentData & { videoUrls: Array<string> }) => Promise<void>
}

interface EditModeProps {
  mode: 'edit'
  isOpen: boolean
  onClose: () => void
  incident: {
    location: string | null
    description: string | null
    incidentDate: Date | null
    videos: Array<Video>
  }
  onAddVideo: (url: string) => Promise<void>
  onUpdate: (data: IncidentData) => Promise<void>
}

type IncidentModalProps = CreateModeProps | EditModeProps

export function IncidentModal(props: IncidentModalProps) {
  const { isOpen, onClose, mode } = props

  const formRef = useRef<HTMLFormElement>(null)
  const addVideoRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [videoError, setVideoError] = useState('')

  // Video URL inputs for create mode
  const [inputKeys, setInputKeys] = useState([0])
  const [urlErrors, setUrlErrors] = useState<Record<number, string>>({})
  const nextKeyRef = useRef(1)

  const handleClose = () => {
    formRef.current?.reset()
    setInputKeys([0])
    nextKeyRef.current = 1
    setUrlErrors({})
    setVideoError('')
    onClose()
  }

  // Create mode: video URL management
  const addVideoUrl = () => {
    setInputKeys([...inputKeys, nextKeyRef.current])
    nextKeyRef.current++
  }

  const removeVideoUrl = (key: number) => {
    setInputKeys(inputKeys.filter((k) => k !== key))
    setUrlErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const validateUrl = (key: number, value: string) => {
    if (value.trim() && !isValidVideoUrl(value)) {
      setUrlErrors((prev) => ({ ...prev, [key]: 'Use a supported platform link' }))
    } else {
      setUrlErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  // Edit mode: add video
  const handleAddVideo = async () => {
    if (mode !== 'edit') return
    const url = addVideoRef.current?.value.trim()
    if (!url) return

    if (!isValidVideoUrl(url)) {
      setVideoError('Use a supported platform link')
      return
    }

    setIsSubmitting(true)
    setVideoError('')
    try {
      await props.onAddVideo(url)
      if (addVideoRef.current) addVideoRef.current.value = ''
      toast.success('Video added')
    } catch {
      toast.error('Failed to add video')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const location = (formData.get('location') as string)?.trim()
    const description = (formData.get('description') as string)?.trim()
    const incidentDate = formData.get('incidentDate') as string

    if (mode === 'create') {
      const videoUrls = inputKeys
        .map((key) => (formData.get(`video-${key}`) as string)?.trim())
        .filter((url) => url && isValidVideoUrl(url))

      if (videoUrls.length === 0) {
        setUrlErrors({ [inputKeys[0]]: 'At least one valid video URL required' })
        return
      }

      setIsSubmitting(true)
      try {
        await props.onSubmit({
          location: location || undefined,
          description: description || undefined,
          incidentDate: incidentDate || undefined,
          videoUrls,
        })
        handleClose()
      } finally {
        setIsSubmitting(false)
      }
    } else {
      setIsSubmitting(true)
      try {
        await props.onUpdate({
          location: location || undefined,
          description: description || undefined,
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
  }

  const title = mode === 'create' ? 'Submit an incident' : 'Edit incident'
  const submitText = mode === 'create' ? 'Submit' : 'Save'
  const submittingText = mode === 'create' ? 'Submitting...' : 'Saving...'

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/20" />
        <Dialog.Popup className="fixed top-[15vh] left-1/2 z-50 w-full max-w-md -translate-x-1/2 bg-white p-6">
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            {/* Video URLs - Create mode */}
            {mode === 'create' && (
              <div>
                <label htmlFor="video-0" className="mb-1 block text-sm">
                  Video URLs
                </label>
                <div className="space-y-2">
                  {inputKeys.map((key, index) => (
                    <div key={key}>
                      <div className="flex gap-2">
                        <input
                          id={`video-${key}`}
                          name={`video-${key}`}
                          type="url"
                          onBlur={(e) => validateUrl(key, e.target.value)}
                          placeholder="https://x.com/..."
                          className="w-full border-b border-neutral-300 bg-transparent py-1 text-sm focus:border-neutral-900 focus:outline-none"
                          aria-label={`Video URL ${index + 1}`}
                        />
                        {inputKeys.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeVideoUrl(key)}
                            className="cursor-pointer text-sm text-neutral-400 hover:text-neutral-900"
                            aria-label={`Remove video URL ${index + 1}`}
                          >
                            ×
                          </button>
                        )}
                      </div>
                      {urlErrors[key] && (
                        <p className="mt-1 text-xs text-red-600">{urlErrors[key]}</p>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addVideoUrl}
                  className="mt-2 cursor-pointer text-sm text-neutral-400 hover:text-neutral-900"
                >
                  + Add another
                </button>
              </div>
            )}

            {/* Existing videos - Edit mode */}
            {mode === 'edit' && (
              <>
                <div>
                  <label className="mb-2 block text-sm text-neutral-500">
                    Videos ({props.incident.videos.length})
                  </label>
                  <div className="space-y-1">
                    {props.incident.videos.map((video) => (
                      <div key={video.id} className="truncate text-xs text-neutral-400">
                        {video.platform}: {video.url}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="add-video" className="mb-1 block text-sm">
                    Add Video
                  </label>
                  <input
                    id="add-video"
                    ref={addVideoRef}
                    type="url"
                    onChange={() => setVideoError('')}
                    placeholder="https://x.com/..."
                    className="w-full border-b border-neutral-300 bg-transparent py-1 text-sm focus:border-neutral-900 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddVideo()
                      }
                    }}
                  />
                  {videoError && <p className="mt-1 text-xs text-red-600">{videoError}</p>}
                  <button
                    type="button"
                    onClick={handleAddVideo}
                    disabled={isSubmitting}
                    className="mt-2 cursor-pointer text-sm text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
                  >
                    + Add
                  </button>
                </div>
              </>
            )}

            {/* Shared fields */}
            <div>
              <label htmlFor="location" className="mb-1 block text-sm">
                Location (optional)
              </label>
              <input
                id="location"
                name="location"
                type="text"
                defaultValue={mode === 'edit' ? props.incident.location || '' : ''}
                placeholder="Minneapolis, MN"
                className="w-full border-b border-neutral-300 bg-transparent py-1 text-sm focus:border-neutral-900 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="incidentDate" className="mb-1 block text-sm">
                Date (optional)
              </label>
              <input
                id="incidentDate"
                name="incidentDate"
                type="date"
                defaultValue={
                  mode === 'edit' && props.incident.incidentDate
                    ? new Date(props.incident.incidentDate).toISOString().split('T')[0]
                    : ''
                }
                className="w-full border-b border-neutral-300 bg-transparent py-1 text-sm focus:border-neutral-900 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="description" className="mb-1 block text-sm">
                Description (optional)
              </label>
              <textarea
                id="description"
                name="description"
                rows={2}
                defaultValue={mode === 'edit' ? props.incident.description || '' : ''}
                placeholder="Brief description of what happened..."
                className="w-full resize-none border-b border-neutral-300 bg-transparent py-1 text-sm focus:border-neutral-900 focus:outline-none"
              />
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-900 disabled:opacity-50"
              >
                {isSubmitting ? submittingText : submitText}
              </button>
              <Dialog.Close className="cursor-pointer text-sm text-neutral-400 hover:text-neutral-900">
                Cancel
              </Dialog.Close>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
