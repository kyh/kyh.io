'use client'

import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'

import type { VideoPlatform } from '@/db/schema'

import { VideoEmbed } from './VideoEmbed'

interface Video {
  id: number
  url: string
  platform: VideoPlatform
}

interface VideoCarouselProps {
  videos: Video[]
}

export function VideoCarousel({ videos }: VideoCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
  })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
    setCanScrollNext(emblaApi.canScrollNext())
  }, [emblaApi])

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

  if (videos.length === 1) {
    return (
      <div>
        <VideoEmbed url={videos[0].url} platform={videos[0].platform} />
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3">
          {videos.map((video) => (
            <div key={video.id} className="min-w-0 flex-[0_0_100%]">
              <VideoEmbed url={video.url} platform={video.platform} />
            </div>
          ))}
        </div>
      </div>

      {videos.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1">
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
        </div>
      )}

      {canScrollNext && (
        <div className="pointer-events-none absolute right-0 top-0 flex h-full w-8 items-center justify-center bg-gradient-to-l from-white/80 to-transparent">
          <span className="text-xs text-neutral-400">→</span>
        </div>
      )}
    </div>
  )
}
