'use client'

import { useState } from 'react'

import { VideoCarousel } from './VideoCarousel'
import type { VideoPlatform } from '@/db/schema'


interface Video {
  id: number
  url: string
  platform: VideoPlatform
}

interface IncidentCardContentProps {
  incidentId: number
  location: string | null
  incidentDate: Date | null
  createdAt: Date | null
  videos: Array<Video>
  unjustifiedCount: number
  justifiedCount: number
  userVote: 'unjustified' | 'justified' | null
  onVote: (type: 'unjustified' | 'justified') => void
  onReport?: () => void
  reported?: boolean
  headerRight?: React.ReactNode
}

function formatDate(date: Date | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function IncidentCardContent({
  incidentId,
  location,
  incidentDate,
  createdAt,
  videos,
  unjustifiedCount,
  justifiedCount,
  userVote,
  onVote,
  onReport,
  reported,
  headerRight,
}: IncidentCardContentProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const displayDate = incidentDate ?? createdAt
  const currentVideo = videos[currentSlide] ?? videos[0]

  return (
    <>
      <VideoCarousel
        videos={videos}
        incidentId={incidentId}
        onSlideChange={setCurrentSlide}
        header={
          <span>
            {location && <>{location}</>}
            {location && displayDate && <> · </>}
            {displayDate && formatDate(displayDate)}
          </span>
        }
        headerRight={headerRight}
      />

      <div className="mt-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onVote('unjustified')}
            className={`cursor-pointer ${userVote === 'unjustified' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-900'}`}
          >
            unjustified ({unjustifiedCount})
          </button>
          <button
            onClick={() => onVote('justified')}
            className={`cursor-pointer ${userVote === 'justified' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-900'}`}
          >
            justified ({justifiedCount})
          </button>
        </div>
        <div className="flex items-center gap-3">
          {currentVideo && (
            <a
              href={currentVideo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-neutral-400 hover:text-neutral-900"
            >
              open on{' '}
              {currentVideo.platform === 'twitter'
                ? 'x'
                : currentVideo.platform}
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
          )}
          {onReport && (
            <button
              onClick={onReport}
              disabled={reported}
              className={`cursor-pointer ${reported ? 'text-neutral-300' : 'text-neutral-400 hover:text-red-600'}`}
            >
              {reported ? 'reported' : 'report'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
