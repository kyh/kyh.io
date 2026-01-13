'use client'

import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'

import type { VideoPlatform } from '@/db/schema'

import { useKeyboardShortcuts } from './KeyboardShortcutsProvider'
import { VideoEmbed } from './VideoEmbed'

interface Video {
  id: number
  url: string
  platform: VideoPlatform
}

interface VideoCarouselProps {
  videos: Video[]
  header?: React.ReactNode
  headerRight?: React.ReactNode
  incidentId?: number
  onSlideChange?: (index: number) => void
}

export function VideoCarousel({ videos, header, headerRight, incidentId, onSlideChange }: VideoCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
  })
  const shortcuts = useKeyboardShortcuts()

  // Register carousel with keyboard shortcuts provider
  useEffect(() => {
    if (incidentId === undefined || !shortcuts) return
    shortcuts.registerCarousel(incidentId, emblaApi ?? null)
    return () => shortcuts.unregisterCarousel(incidentId)
  }, [incidentId, emblaApi, shortcuts])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    const index = emblaApi.selectedScrollSnap()
    setSelectedIndex(index)
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
    onSlideChange?.(index)
  }, [emblaApi, onSlideChange])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  if (videos.length === 0) return null

  const showNav = videos.length > 1

  return (
    <div>
      {(header || showNav || headerRight) && (
        <div className="mb-3 flex items-center justify-between text-sm text-neutral-500">
          <div className="flex items-center gap-3">
            <div>{header}</div>
            {showNav && (
              <div className="flex items-center gap-1">
                {videos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => emblaApi?.scrollTo(index)}
                    className={`h-1.5 rounded-full transition-all ${
                      index === selectedIndex
                        ? 'w-4 bg-neutral-900'
                        : 'w-1.5 bg-neutral-300 hover:bg-neutral-400'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
                <button
                  onClick={() => emblaApi?.scrollPrev()}
                  disabled={!canScrollPrev}
                  className={`pl-1 ${canScrollPrev ? 'text-neutral-500 hover:text-neutral-900' : 'text-neutral-300'}`}
                  aria-label="Previous"
                >
                  ←
                </button>
                <button
                  onClick={() => emblaApi?.scrollNext()}
                  disabled={!canScrollNext}
                  className={`${canScrollNext ? 'text-neutral-500 hover:text-neutral-900' : 'text-neutral-300'}`}
                  aria-label="Next"
                >
                  →
                </button>
              </div>
            )}
          </div>
          {headerRight && <div>{headerRight}</div>}
        </div>
      )}

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3">
          {videos.map((video) => (
            <div key={video.id} className="min-w-0 flex-[0_0_100%]">
              <VideoEmbed url={video.url} platform={video.platform} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
