"use client";

import { transitionProperty } from "@repo/tailwind-compat/transitions.stylex";
import { appIcon, theme } from "../styles/tokens.stylex";

import { up as mediaUp } from "@repo/tailwind-compat/media.stylex";

import {
  defaults,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";

import * as stylex from "@stylexjs/stylex";
import { ringSlots } from "@repo/tailwind-compat/shadows.stylex";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { Dialog } from "@base-ui/react/dialog";
import { AnimatePresence, motion, MotionConfig } from "motion/react";

const styles = stylex.create({
  app: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: spacing[2],
    textDecoration: "none",
    transitionProperty: transitionProperty.transform,
    transitionTimingFunction: defaults.transitionTimingFunction,
    transitionDuration: ".2s",
    scale: { default: null, ":active": "0.95 0.95" },
  },
  icon: {
    position: "relative",
    width: "60px",
    height: "60px",
    overflow: "hidden",
    borderRadius: "14px",
  },
  iconShadow: { boxShadow: appIcon.shadow },
  label: {
    color: theme.foreground,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    borderRadius: radii.md,
    paddingInline: spacing[1.5],
    paddingBlock: spacing[0.5],
    textAlign: "center",
    fontSize: fontSizes.xs,
    lineHeight: 1,
    fontWeight: fontWeights.medium,
  },
  floatLabel: {
    color: theme.foreground,
    position: "absolute",
    top: "68px",
    zIndex: 10,
    borderRadius: radii.md,
    backgroundColor: "color-mix(in srgb, var(--bg-color) 70%, transparent)",
    paddingInline: spacing[1.5],
    paddingBlock: spacing[0.5],
    textAlign: "center",
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    whiteSpace: "nowrap",
    backdropFilter: "blur(12px)",
  },
  centerRow: { display: "flex", alignItems: "center", justifyContent: "center" },
  folder: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: spacing[2],
    transitionProperty: transitionProperty.transform,
    transitionTimingFunction: defaults.transitionTimingFunction,
    transitionDuration: ".2s",
    willChange: "transform",
    userSelect: "none",
    scale: { default: null, ":active": "0.95 0.95" },
  },
  folderIcon: {
    position: "relative",
    width: "60px",
    height: "60px",
    borderRadius: "14px",
    backgroundColor: appIcon.bg,
    padding: spacing[2],
    boxShadow: appIcon.shadow,
    backdropFilter: "blur(12px)",
  },
  folderGrid: {
    display: "grid",
    height: "100%",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gridTemplateRows: "repeat(2, minmax(0, 1fr))",
    gap: spacing[1],
  },
  folderTile: {
    position: "relative",
    aspectRatio: "1 / 1",
    overflow: "hidden",
    borderRadius: radii.default,
    boxShadow: `${ringSlots.before}, 0 0 0 1px ${appIcon.ring}, ${ringSlots.after}`,
  },
  /** background follows the hovered `.group` ancestor; see global.css */
  folderLabel: {
    color: theme.foreground,
    backgroundColor: "var(--group-label-bg, transparent)",
    maxWidth: "80px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    borderRadius: radii.md,
    paddingInline: spacing[1.5],
    paddingBlock: spacing[0.5],
    textAlign: "center",
    fontSize: fontSizes.xs,
    lineHeight: 1,
    fontWeight: fontWeights.medium,
    transitionProperty: transitionProperty.colors,
    transitionTimingFunction: defaults.transitionTimingFunction,
    transitionDuration: defaults.transitionDuration,
  },
  scrim: {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    backgroundColor: appIcon.overlayBg,
    backdropFilter: "blur(4px)",
  },
  sheet: {
    position: "fixed",
    top: "50%",
    left: "50%",
    zIndex: 50,
    display: "flex",
    width: { default: "100%", [mediaUp.sm]: "auto" },
    translate: "-50% -50%",
    flexDirection: "column",
    alignItems: "center",
    padding: { default: spacing[4], [mediaUp.sm]: spacing[8] },
    willChange: "transform",
  },
  sheetTitle: {
    color: theme.foreground,
    marginBottom: spacing[6],
    width: "100%",
    textAlign: "center",
    fontSize: fontSizes["2xl"],
    fontWeight: fontWeights.semibold,
  },
  sheetGrid: {
    display: "grid",
    width: "100%",
    gridTemplateColumns: {
      default: "repeat(3, minmax(0, 1fr))",
      [mediaUp.sm]: "repeat(4, minmax(0, 1fr))",
    },
    gap: { default: spacing[4], [mediaUp.sm]: spacing[5] },
    maxWidth: { default: null, [mediaUp.sm]: "400px" },
  },
});

// Types
type Point = { x: number; y: number };

export type ProjectAppItem = {
  key: string;
  name: string;
  iconSrc: string;
  url?: string;
};

// Motion config
const springTransition = {
  type: "spring",
  stiffness: 200,
  damping: 22,
} as const;
const labelSpring = { type: "spring", stiffness: 400, damping: 30 } as const;
const titleSpring = { ...springTransition, damping: 19 } as const;
const titleExitSpring = { ...springTransition, stiffness: 300 } as const;
const openStaggerDelay = 0.025;
const closeStaggerDelay = 0.05;

const iconSize = 60;
const maxLabelWidth = 90;

type ProjectAppProps = {
  name: string;
  iconSrc: string;
  url?: string;
  showShadow?: boolean;
};

export const ProjectApp = ({ name, iconSrc, url, showShadow = true }: ProjectAppProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const labelRef = useRef<HTMLDivElement>(null);

  const shouldExpand = isHovered && isTruncated;

  const handleHoverStart = () => {
    const label = labelRef.current;
    setIsTruncated(!!label && label.scrollWidth > label.clientWidth);
    setIsHovered(true);
  };

  const Wrapper = url ? motion.a : motion.div;
  const wrapperProps = url ? { href: url, target: "_blank", rel: "noopener noreferrer" } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`ease ${stylex.props(styles.app).className}`}
      data-slot="app"
      onHoverStart={handleHoverStart}
      onHoverEnd={() => setIsHovered(false)}
    >
      <div {...stylex.props(styles.icon, showShadow && styles.iconShadow)} data-slot="app-icon">
        <Image src={iconSrc} alt={name} fill sizes={`${iconSize}px`} draggable={false} />
      </div>

      {/* Visible truncated label */}
      <motion.div
        ref={labelRef}
        className={stylex.props(styles.label).className}
        style={{ maxWidth: maxLabelWidth }}
        data-slot="app-label"
        initial={false}
        animate={{
          backgroundColor: isHovered
            ? "color-mix(in srgb, var(--bg-color) 50%, transparent)"
            : "transparent",
          opacity: shouldExpand ? 0 : 1,
        }}
        transition={labelSpring}
      >
        {name}
      </motion.div>

      {/* Expanded label tooltip */}
      <AnimatePresence>
        {shouldExpand && (
          <motion.div
            className={stylex.props(styles.floatLabel).className}
            data-slot="app-label-expanded"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={labelSpring}
          >
            {name}
          </motion.div>
        )}
      </AnimatePresence>
    </Wrapper>
  );
};

const OpenGridItem = ({
  item,
  idx,
  registerRef,
  itemOffsets,
  offsetsReady,
}: {
  item: ProjectAppItem;
  idx: number;
  registerRef: (key: string, el: HTMLDivElement | null) => void;
  itemOffsets: Record<string, Point>;
  offsetsReady: boolean;
}) => {
  const offset = itemOffsets[item.key] ?? { x: 0, y: 0 };
  const openDelay = offsetsReady ? idx * openStaggerDelay : 0;
  const closeDelay = offsetsReady ? closeStaggerDelay : 0;

  const setRef = useCallback(
    (el: HTMLDivElement | null) => registerRef(item.key, el),
    [registerRef, item.key],
  );

  return (
    <motion.div
      ref={setRef}
      initial={offsetsReady ? { opacity: 0, scale: 0.2, x: offset.x, y: offset.y } : { opacity: 0 }}
      animate={offsetsReady ? { opacity: 1, scale: 1, x: 0, y: 0 } : { opacity: 0 }}
      exit={{
        opacity: 0,
        scale: 0.2,
        x: offset.x,
        y: offset.y,
        transition: {
          ...springTransition,
          delay: closeDelay,
          opacity: { delay: closeStaggerDelay },
        },
      }}
      transition={{
        ...springTransition,
        delay: openDelay,
      }}
    >
      <ProjectApp name={item.name} iconSrc={item.iconSrc} url={item.url} showShadow={false} />
    </motion.div>
  );
};

export const ProjectAppGroup = ({ title, items }: { title: string; items: ProjectAppItem[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const folderRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState<Point | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [itemOffsets, setItemOffsets] = useState<Record<string, Point>>({});

  const registerRef = useCallback((key: string, el: HTMLDivElement | null) => {
    itemRefs.current[key] = el;
  }, []);

  const handleOpen = useCallback(() => {
    const rect = folderRef.current?.getBoundingClientRect();
    if (rect) {
      setOrigin({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }
    setIsOpen(true);
  }, []);

  const handleExitComplete = useCallback(() => {
    if (!isOpen) {
      setItemOffsets({});
      setOrigin(null);
    }
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !origin) return;

    const frame = requestAnimationFrame(() => {
      const next: Record<string, Point> = {};
      for (const item of items) {
        const el = itemRefs.current[item.key];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        next[item.key] = { x: origin.x - cx, y: origin.y - cy };
      }
      setItemOffsets(next);
    });

    return () => cancelAnimationFrame(frame);
  }, [isOpen, origin, items]);

  const offsetsReady = isOpen && origin && Object.keys(itemOffsets).length === items.length;

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <MotionConfig transition={springTransition}>
        <div {...stylex.props(styles.centerRow)} data-slot="app-group">
          <motion.div
            initial={false}
            animate={{ opacity: isOpen ? 0 : 1, scale: isOpen ? 0.9 : 1 }}
            transition={springTransition}
          >
            <Dialog.Trigger
              className={`group ease ${stylex.props(styles.folder).className}`}
              onClick={handleOpen}
              style={{ pointerEvents: isOpen ? "none" : "auto" }}
              data-slot="folder-trigger"
            >
              <div {...stylex.props(styles.folderIcon)} ref={folderRef} data-slot="folder-preview">
                <div {...stylex.props(styles.folderGrid)} data-slot="folder-grid">
                  {items.slice(0, 4).map((item) => (
                    <div key={item.key} {...stylex.props(styles.folderTile)} data-slot="mini-cell">
                      <Image
                        src={item.iconSrc}
                        alt={item.name}
                        fill
                        sizes="20px"
                        draggable={false}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className={stylex.props(styles.folderLabel).className} data-slot="folder-name">
                {title}
              </div>
            </Dialog.Trigger>
          </motion.div>
        </div>

        <AnimatePresence onExitComplete={handleExitComplete}>
          {isOpen && (
            <Dialog.Portal keepMounted>
              <Dialog.Backdrop
                render={
                  <motion.div
                    {...stylex.props(styles.scrim)}
                    data-slot="backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{
                      opacity: 0,
                      transition: { delay: openStaggerDelay },
                    }}
                  />
                }
                onClick={() => setIsOpen(false)}
              />
              <Dialog.Popup
                render={
                  <motion.div
                    {...stylex.props(styles.sheet)}
                    data-slot="open-folder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                }
              >
                <motion.div
                  className={stylex.props(styles.sheetTitle).className}
                  data-slot="open-title"
                  initial={{ opacity: 0, y: 30, x: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                  exit={{
                    opacity: 0,
                    y: 30,
                    x: 10,
                    scale: 0.8,
                    transition: titleExitSpring,
                  }}
                  transition={titleSpring}
                >
                  <Dialog.Title>{title}</Dialog.Title>
                </motion.div>

                <div className={stylex.props(styles.sheetGrid).className} data-slot="open-grid">
                  {items.map((item, idx) => (
                    <OpenGridItem
                      key={`${item.key}-${offsetsReady ? "ready" : "wait"}`}
                      item={item}
                      idx={idx}
                      registerRef={registerRef}
                      itemOffsets={itemOffsets}
                      offsetsReady={!!offsetsReady}
                    />
                  ))}
                </div>
              </Dialog.Popup>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </MotionConfig>
    </Dialog.Root>
  );
};
