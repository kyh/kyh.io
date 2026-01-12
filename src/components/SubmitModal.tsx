import { useState } from 'react'

import { isValidVideoUrl } from '@/lib/video-utils'

interface SubmitModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    location?: string
    incidentDate?: string
    videoUrls: string[]
  }) => Promise<{ autoApproved: boolean; merged: boolean }>
}

export function SubmitModal({ isOpen, onClose, onSubmit }: SubmitModalProps) {
  const [location, setLocation] = useState('')
  const [incidentDate, setIncidentDate] = useState('')
  const [videoUrls, setVideoUrls] = useState<string[]>([''])
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [wasAutoApproved, setWasAutoApproved] = useState(false)
  const [wasMerged, setWasMerged] = useState(false)

  const resetForm = () => {
    setLocation('')
    setIncidentDate('')
    setVideoUrls([''])
    setErrors({})
    setSubmitted(false)
    setWasAutoApproved(false)
    setWasMerged(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const addVideoUrl = () => setVideoUrls([...videoUrls, ''])

  const removeVideoUrl = (index: number) => {
    setVideoUrls(videoUrls.filter((_, i) => i !== index))
    const newErrors = { ...errors }
    delete newErrors[index]
    setErrors(newErrors)
  }

  const updateVideoUrl = (index: number, value: string) => {
    const updated = [...videoUrls]
    updated[index] = value
    setVideoUrls(updated)

    if (value.trim()) {
      if (!isValidVideoUrl(value)) {
        setErrors({ ...errors, [index]: 'Use a supported platform link' })
      } else {
        const newErrors = { ...errors }
        delete newErrors[index]
        setErrors(newErrors)
      }
    } else {
      const newErrors = { ...errors }
      delete newErrors[index]
      setErrors(newErrors)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validUrls = videoUrls.filter((url) => url.trim() && isValidVideoUrl(url))

    if (validUrls.length === 0) {
      setErrors({ 0: 'At least one valid video URL required' })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await onSubmit({
        location: location.trim() || undefined,
        incidentDate: incidentDate || undefined,
        videoUrls: validUrls,
      })
      setWasAutoApproved(result.autoApproved)
      setWasMerged(result.merged)
      setSubmitted(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 p-4 pt-[15vh]"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="w-full max-w-md bg-white p-6 shadow-lg">
        {submitted ? (
          <div>
            <p className="text-sm">
              {wasMerged
                ? 'Added to existing incident.'
                : wasAutoApproved
                  ? 'Added to feed.'
                  : 'Submitted for review.'}
            </p>
            <button
              onClick={handleClose}
              className="mt-4 cursor-pointer text-sm text-neutral-400 hover:text-neutral-900"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm">Video URLs</label>
              <div className="space-y-2">
                {videoUrls.map((url, index) => (
                  <div key={index}>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => updateVideoUrl(index, e.target.value)}
                        placeholder="https://x.com/..."
                        className="w-full border-b border-neutral-300 bg-transparent py-1 text-sm focus:border-neutral-900 focus:outline-none"
                      />
                      {videoUrls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVideoUrl(index)}
                          className="cursor-pointer text-sm text-neutral-400 hover:text-neutral-900"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    {errors[index] && (
                      <p className="mt-1 text-xs text-red-600">{errors[index]}</p>
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

            <div>
              <label className="mb-1 block text-sm">Location (optional)</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Los Angeles, CA"
                className="w-full border-b border-neutral-300 bg-transparent py-1 text-sm focus:border-neutral-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm">Date (optional)</label>
              <input
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="w-full border-b border-neutral-300 bg-transparent py-1 text-sm focus:border-neutral-900 focus:outline-none"
              />
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-900 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="cursor-pointer text-sm text-neutral-400 hover:text-neutral-900"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
