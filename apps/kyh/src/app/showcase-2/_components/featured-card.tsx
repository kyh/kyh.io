"use client";

import type { FC, ReactNode, Ref } from "react";
import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import type { WorkMedia } from "./works";

/* The floating spotlight uses the tooltip/panel shadow rather than a bespoke
   one, so elevation reads the same as the rest of the site in both themes. */
const CARD_SHADOW =
  "var(--colors-shadowLight) 0px 10px 38px -10px, var(--colors-shadowDark) 0px 10px 20px -15px";

/* The expanded state hangs satellite UI off the card: prev/next plus a title
   that can wrap to two lines above (~150px), link and description below
   (~95px). The card is centred in the frame, so the taller side governs — the
   budget below reserves twice the top chrome. Under ~430px of frame height the
   chrome cannot fit at any card size; MIN_EXPANDED_H stops the card collapsing
   to nothing while it degrades. Both are inert at the designed size, where
   `expH` wins the Math.min. */
const EXPANDED_CHROME_H = 300;
const MIN_EXPANDED_H = 120;

interface IconButtonProps {
  onClick: () => void;
  label: string;
  /** `sm` is the prev/next pair; `md` is close. */
  size: "sm" | "md";
  ref?: Ref<HTMLButtonElement>;
  children: ReactNode;
}

/* Card-level clicks open the detail view, so every control inside has to stop
   the event before running its own action. */
const IconButton: FC<IconButtonProps> = ({ onClick, label, size, ref, children }) => (
  <button
    ref={ref}
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={`dock-item flex items-center justify-center rounded-[25%] ${size === "sm" ? "size-8" : "size-9"}`}
    aria-label={label}
  >
    {children}
  </button>
);

interface FeaturedCardProps {
  photo: WorkMedia;
  expanded: boolean;
  isMobile: boolean;
  /** Frame size, so the card can never outgrow the preview box. */
  vw: number;
  vh: number;
  onOpen: () => void;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export const FeaturedCard: FC<FeaturedCardProps> = ({
  photo,
  expanded,
  isMobile,
  vw,
  vh,
  onOpen,
  onClose,
  onNext,
  onPrev,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  /* Expanding strips the card's own `role`/`tabIndex`, which destroys the
     focusability of the element that was just activated — so hand focus to
     Close, and give it back on collapse. Seeded from `expanded` so a mount in
     either state never steals focus from the surrounding page. */
  const wasExpanded = useRef(expanded);

  useEffect(() => {
    if (wasExpanded.current === expanded) return;
    wasExpanded.current = expanded;
    if (expanded) closeRef.current?.focus();
    else cardRef.current?.focus();
  }, [expanded]);

  const restH = isMobile ? 220 : 280;
  const restMaxW = isMobile ? 270 : 400;
  const expH = isMobile ? 280 : 360;
  const expMaxW = isMobile ? 300 : 480;
  const expMinW = isMobile ? 260 : 340;

  const heightBudget = expanded
    ? Math.min(vh * 0.44, Math.max(MIN_EXPANDED_H, vh - EXPANDED_CHROME_H))
    : vh * 0.62;
  const widthBudget = vw * (expanded ? 0.78 : 0.86);

  const h = Math.min(expanded ? expH : restH, heightBudget);
  const maxW = Math.min(expanded ? expMaxW : restMaxW, widthBudget);
  /* Clamp against the height budget too: without it, a tall-but-narrow asset
     takes the min-width branch below and recomputes frameH from width alone,
     re-inflating past the budget and clipping the satellite UI in short frames. */
  const minW = Math.min(expMinW, widthBudget, heightBudget * photo.aspect);

  let w = h * photo.aspect;
  let frameH = h;
  if (w > maxW) {
    w = maxW;
    frameH = maxW / photo.aspect;
  } else if (expanded && w < minW) {
    w = minW;
    frameH = minW / photo.aspect;
  }

  const visitLink = (
    <a
      href={photo.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      data-text="Visit"
      className="link text-sm"
    >
      Visit
    </a>
  );
  const closeBtn = (
    <IconButton ref={closeRef} onClick={onClose} label="Close" size="md">
      <X className="size-4" />
    </IconButton>
  );

  return (
    <div
      ref={cardRef}
      className={`pointer-events-auto absolute${expanded ? "" : " cursor-pointer"}`}
      style={{
        width: w,
        height: frameH,
        transform: "translate(-50%, -50%)",
        transition:
          "width 0.25s cubic-bezier(0.16, 1, 0.3, 1), height 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      onClick={onOpen}
      /* Expanded, this behaves as a modal — Escape and a backdrop click both
         close it, and the wall behind is `aria-hidden`. */
      role={expanded ? "dialog" : "button"}
      aria-modal={expanded ? true : undefined}
      tabIndex={expanded ? -1 : 0}
      aria-label={expanded ? photo.title : `Open ${photo.title}`}
      onKeyDown={
        expanded
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen();
              }
            }
      }
    >
      {expanded && (
        <div className="absolute bottom-full left-1/2 mb-4 w-max max-w-[80%] -translate-x-1/2 text-center">
          <div className="flex items-center justify-center gap-3">
            <IconButton onClick={onPrev} label="Previous work" size="sm">
              <ChevronLeft className="size-4" />
            </IconButton>
            <IconButton onClick={onNext} label="Next work" size="sm">
              <ChevronRight className="size-4" />
            </IconButton>
          </div>
          <div className="text-foreground-faded mt-3 text-xs tracking-[0.2em] uppercase">
            {photo.category}
          </div>
          <h2
            className={`text-foreground-highlighted mt-1 leading-tight font-normal ${
              isMobile ? "text-2xl" : "text-3xl"
            }`}
          >
            {photo.title}
          </h2>
        </div>
      )}

      {/* Close sits on the card's own corner: a side rail would be a lone
          floating button now that the photo-app toggles are gone. */}
      {expanded && !isMobile && <div className="absolute -top-3 -right-3 z-10">{closeBtn}</div>}

      {/* Same frame treatment as the site's Card component, minus its
          pointer-events reset (the collapsed card is itself a button). */}
      <div
        className="relative h-full w-full overflow-hidden rounded-xl border border-[var(--dock-border-color)] bg-gradient-to-t from-[var(--dock-border-color)] to-[var(--dock-bg)] p-1 backdrop-blur-[10px]"
        style={{ boxShadow: CARD_SHADOW }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-lg">
          {photo.videoUrl ? (
            /* Plays collapsed too — the spotlight is the one place a single
             full-fidelity video is cheap. The poster covers the load gap as
             the void drifts and the featured asset changes. */
            <video
              src={photo.videoUrl}
              poster={photo.thumbUrl}
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- wall deck srcs include generated poster data URLs; next/image can't optimize those
            <img
              src={photo.thumbUrl}
              alt={photo.title}
              draggable={false}
              decoding="async"
              className="h-full w-full object-cover"
            />
          )}
          {/* Caption sits over arbitrary media, so it keeps its own dark
              scrim and white text in both themes rather than page tokens. */}
          {!expanded && (
            <div
              className="absolute inset-x-0 bottom-0 p-3"
              style={{
                background:
                  "linear-gradient(to top, rgb(0 0 0 / 0.85) 0%, rgb(0 0 0 / 0.4) 50%, transparent 100%)",
              }}
            >
              <div className="text-[10px] tracking-[0.22em] text-white/75 uppercase">
                {photo.category}
              </div>
              <div className="truncate text-base text-white">{photo.title}</div>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div
          className="absolute top-full left-1/2 mt-4 -translate-x-1/2 text-center"
          style={{
            minWidth: Math.min(isMobile ? 260 : 320, vw * 0.9),
            maxWidth: vw * 0.9,
          }}
        >
          {visitLink}

          {isMobile && (
            <div className="mt-3 flex items-center justify-center gap-2">{closeBtn}</div>
          )}

          {!isMobile && (
            <p className="text-foreground-faded mx-auto mt-3 text-sm" style={{ maxWidth: 440 }}>
              {photo.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
