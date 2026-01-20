"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { Dialog } from "@base-ui/react/dialog";
import { AnimatePresence, motion, MotionConfig } from "motion/react";

// Types
type Point = { x: number; y: number };

export type ProjectAppItem = {
  key: string;
  name: string;
  iconSrc: string;
  url?: string;
};

// Motion config
const springTransition = { type: "spring", stiffness: 200, damping: 22 } as const;
const titleSpring = { ...springTransition, damping: 19 } as const;
const titleExitSpring = { ...springTransition, stiffness: 300 } as const;
const openStaggerDelay = 0.025;
const closeStaggerDelay = 0.05;

// Shared styles
const labelClassName = "text-xs font-medium text-foreground text-center truncate max-w-[80px]";
const iconSize = 60;

export const ProjectApp = ({
  name,
  iconSrc,
  url,
}: Omit<ProjectAppItem, "key" | "url"> & { url: string }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex flex-col items-center gap-2 no-underline transition-transform duration-200 ease active:scale-95"
    data-slot="app"
  >
    <div
      className="relative size-[60px] rounded-[14px] overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.15)]"
      data-slot="app-icon"
    >
      <Image src={iconSrc} alt={name} fill sizes={`${iconSize}px`} draggable={false} />
    </div>
    <span className={labelClassName} data-slot="app-label">{name}</span>
  </a>
);

const OpenGridItem = ({
  item,
  idx,
  itemRefs,
  itemOffsets,
  offsetsReady,
}: {
  item: ProjectAppItem;
  idx: number;
  itemRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  itemOffsets: Record<string, Point>;
  offsetsReady: boolean;
}) => {
  const offset = itemOffsets[item.key] ?? { x: 0, y: 0 };
  const openDelay = offsetsReady ? idx * openStaggerDelay : 0;
  const closeDelay = offsetsReady ? closeStaggerDelay : 0;

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      itemRefs.current[item.key] = el;
    },
    [itemRefs, item.key],
  );

  const Wrapper = item.url ? "a" : "div";
  const wrapperProps = item.url
    ? { href: item.url, target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      data-slot="open-item"
      ref={setRef}
      initial={
        offsetsReady
          ? { opacity: 0, scale: 0.2, x: offset.x, y: offset.y }
          : { opacity: 0 }
      }
      animate={
        offsetsReady
          ? { opacity: 1, scale: 1, x: 0, y: 0 }
          : { opacity: 0 }
      }
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
      <Wrapper {...wrapperProps} className="flex flex-col items-center gap-2">
        <div
          className="size-[60px] rounded-[14px] overflow-hidden relative"
          data-slot="open-tile"
        >
          <Image
            src={item.iconSrc}
            alt={item.name}
            fill
            sizes={`${iconSize}px`}
            draggable={false}
          />
        </div>
        <div className={labelClassName} data-slot="open-label">
          {item.name}
        </div>
      </Wrapper>
    </motion.div>
  );
};

export const ProjectAppGroup = ({
  title,
  items,
}: {
  title: string;
  items: ProjectAppItem[];
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const folderRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState<Point | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [itemOffsets, setItemOffsets] = useState<Record<string, Point>>({});

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

  const offsetsReady =
    isOpen && origin && Object.keys(itemOffsets).length === items.length;

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <MotionConfig transition={springTransition}>
        <div className="flex items-center justify-center" data-slot="app-group">
          <motion.div
            initial={false}
            animate={{ opacity: isOpen ? 0 : 1, scale: isOpen ? 0.9 : 1 }}
            transition={springTransition}
          >
            <Dialog.Trigger
              className="flex flex-col items-center gap-2 select-none will-change-transform transition-transform duration-200 ease active:scale-95"
              onClick={handleOpen}
              style={{ pointerEvents: isOpen ? "none" : "auto" }}
              data-slot="folder-trigger"
            >
              <div
                className="relative size-[60px] rounded-[14px] p-2 bg-white/50 dark:bg-[#0f172a]/50 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.15)]"
                ref={folderRef}
                data-slot="folder-preview"
              >
                <div className="grid grid-cols-2 grid-rows-2 gap-1 h-full" data-slot="folder-grid">
                  {items.slice(0, 4).map((item) => (
                    <div
                      key={item.key}
                      className="relative aspect-square rounded overflow-hidden ring-1 ring-black/3 dark:ring-white/15"
                      data-slot="mini-cell"
                    >
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
              <div
                className={`${labelClassName} leading-none`}
                data-slot="folder-name"
              >
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
                    className="fixed inset-0 z-50 bg-white/92 dark:bg-black/90 backdrop-blur-sm"
                    data-slot="backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { delay: openStaggerDelay } }}
                  />
                }
                onClick={() => setIsOpen(false)}
              />
              <Dialog.Popup
                render={
                  <motion.div
                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-8 flex flex-col items-center will-change-transform"
                    data-slot="open-folder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                }
              >
                <motion.div
                  className="text-center w-full text-2xl font-semibold text-foreground mb-6"
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

                <div
                  className="grid grid-cols-4 gap-5 max-w-[400px] w-full"
                  data-slot="open-grid"
                >
                  {items.map((item, idx) => (
                    <OpenGridItem
                      key={`${item.key}-${offsetsReady ? "ready" : "wait"}`}
                      item={item}
                      idx={idx}
                      itemRefs={itemRefs}
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
