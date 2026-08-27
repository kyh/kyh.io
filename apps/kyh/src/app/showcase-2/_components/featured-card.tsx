"use client";

import { theme } from "../../../styles/tokens.stylex";

import {
  fontSizeLineHeights,
  fontSizes,
  fontWeights,
  lineHeights,
  radii,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";

import * as stylex from "@stylexjs/stylex";

import type { FC, ReactNode, Ref } from "react";
import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import type { WorkMedia } from "./works";

const styles = stylex.create({
  dockBtn: { display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "25%" },
  size8: { width: spacing[8], height: spacing[8] },
  size9: { width: spacing[9], height: spacing[9] },
  size4: { width: spacing[4], height: spacing[4] },
  small: { fontSize: fontSizes.sm, lineHeight: fontSizeLineHeights.sm },
  card: { pointerEvents: "auto", position: "absolute" },
  cardClickable: { cursor: "pointer" },
  above: {
    position: "absolute",
    bottom: "100%",
    left: "50%",
    marginBottom: spacing[4],
    width: "max-content",
    maxWidth: "80%",
    translate: "-50% 0",
    textAlign: "center",
  },
  navRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: spacing[3] },
  eyebrow: {
    color: theme.foregroundFaded,
    marginTop: spacing[3],
    fontSize: fontSizes.xs,
    lineHeight: fontSizeLineHeights.xs,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
  },
  title: {
    color: theme.foregroundHighlighted,
    marginTop: spacing[1],
    lineHeight: lineHeights.tight,
    fontWeight: fontWeights.normal,
  },
  title2xl: { fontSize: fontSizes["2xl"] },
  title3xl: { fontSize: fontSizes["3xl"] },
  closeSlot: {
    position: "absolute",
    top: `calc(-1 * ${spacing[3]})`,
    right: `calc(-1 * ${spacing[3]})`,
    zIndex: 10,
  },
  frame: {
    position: "relative",
    height: "100%",
    width: "100%",
    overflow: "hidden",
    borderRadius: radii.xl,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--dock-border-color)",
    backgroundImage:
      "linear-gradient(to top in oklab, var(--dock-border-color) 0%, var(--dock-bg) 100%)",
    padding: spacing[1],
    backdropFilter: "blur(10px)",
  },
  inner: {
    position: "relative",
    height: "100%",
    width: "100%",
    overflow: "hidden",
    borderRadius: radii.lg,
  },
  cover: { height: "100%", width: "100%", objectFit: "cover" },
  caption: { position: "absolute", insetInline: 0, bottom: 0, padding: spacing[3] },
  captionEyebrow: {
    fontSize: "10px",
    letterSpacing: "0.22em",
    color: "color-mix(in oklab, #fff 75%, transparent)",
    textTransform: "uppercase",
  },
  captionTitle: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: fontSizes.base,
    color: "#fff",
  },
  below: {
    position: "absolute",
    top: "100%",
    left: "50%",
    marginTop: spacing[4],
    translate: "-50% 0",
    textAlign: "center",
  },
  closeRow: {
    marginTop: spacing[3],
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
  },
  blurb: {
    color: theme.foregroundFaded,
    marginInline: "auto",
    marginTop: spacing[3],
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
  },
});

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
    className={`dock-item ${stylex.props(styles.dockBtn, size === "sm" ? styles.size8 : styles.size9).className}`}
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
      className={`link ${stylex.props(styles.small).className}`}
    >
      Visit
    </a>
  );
  const closeBtn = (
    <IconButton ref={closeRef} onClick={onClose} label="Close" size="md">
      <X {...stylex.props(styles.size4)} />
    </IconButton>
  );

  return (
    <div
      ref={cardRef}
      {...stylex.props(styles.card, !expanded && styles.cardClickable)}
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
        <div {...stylex.props(styles.above)}>
          <div {...stylex.props(styles.navRow)}>
            <IconButton onClick={onPrev} label="Previous work" size="sm">
              <ChevronLeft {...stylex.props(styles.size4)} />
            </IconButton>
            <IconButton onClick={onNext} label="Next work" size="sm">
              <ChevronRight {...stylex.props(styles.size4)} />
            </IconButton>
          </div>
          <div {...stylex.props(styles.eyebrow)}>{photo.category}</div>
          <h2 {...stylex.props(styles.title, isMobile ? styles.title2xl : styles.title3xl)}>
            {photo.title}
          </h2>
        </div>
      )}

      {/* Close sits on the card's own corner: a side rail would be a lone
          floating button now that the photo-app toggles are gone. */}
      {expanded && !isMobile && <div {...stylex.props(styles.closeSlot)}>{closeBtn}</div>}

      {/* Same frame treatment as the site's Card component, minus its
          pointer-events reset (the collapsed card is itself a button). */}
      <div {...stylex.props(styles.frame)} style={{ boxShadow: CARD_SHADOW }}>
        <div {...stylex.props(styles.inner)}>
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
              {...stylex.props(styles.cover)}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- wall deck srcs include generated poster data URLs; next/image can't optimize those
            <img
              src={photo.thumbUrl}
              alt={photo.title}
              draggable={false}
              decoding="async"
              {...stylex.props(styles.cover)}
            />
          )}
          {/* Caption sits over arbitrary media, so it keeps its own dark
              scrim and white text in both themes rather than page tokens. */}
          {!expanded && (
            <div
              {...stylex.props(styles.caption)}
              style={{
                background:
                  "linear-gradient(to top, rgb(0 0 0 / 0.85) 0%, rgb(0 0 0 / 0.4) 50%, transparent 100%)",
              }}
            >
              <div {...stylex.props(styles.captionEyebrow)}>{photo.category}</div>
              <div {...stylex.props(styles.captionTitle)}>{photo.title}</div>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div
          {...stylex.props(styles.below)}
          style={{
            minWidth: Math.min(isMobile ? 260 : 320, vw * 0.9),
            maxWidth: vw * 0.9,
          }}
        >
          {visitLink}

          {isMobile && <div {...stylex.props(styles.closeRow)}>{closeBtn}</div>}

          {!isMobile && (
            <p {...stylex.props(styles.blurb)} style={{ maxWidth: 440 }}>
              {photo.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
