"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { AnimatePresence, motion, MotionConfig } from "motion/react";

export type ProjectAppItem = {
  key: string;
  name: string;
  iconSrc: string;
  url?: string;
};

export const ProjectApp = ({
  name,
  iconSrc,
  url,
}: {
  name: string;
  iconSrc: string;
  url: string;
}) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="project-app"
  >
    <div className="project-app-icon">
      <img className="h-full w-full" src={iconSrc} alt={name} draggable={false} />
    </div>
    <span className="project-app-label">{name}</span>
  </a>
);

const spring = { type: "spring", stiffness: 200, damping: 22 } as const;

function OpenGridItem({
  item,
  idx,
  itemRefs,
  itemOffsets,
  offsetsReady,
}: {
  item: ProjectAppItem;
  idx: number;
  itemRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  itemOffsets: Record<string, { x: number; y: number }>;
  offsetsReady: boolean;
}) {
  const off = itemOffsets[item.key] ?? { x: 0, y: 0 };
  const openDelay = offsetsReady ? idx * 0.025 : 0;
  const closeDelay = offsetsReady ? 0.05 : 0;

  const content = (
    <>
      <div className="open-tile-box">
        <img
          className="h-full w-full"
          src={item.iconSrc}
          alt={item.name}
          draggable={false}
        />
      </div>
      <div className="open-label">{item.name}</div>
    </>
  );

  return (
    <motion.div
      className="open-item"
      ref={(el) => {
        itemRefs.current[item.key] = el;
      }}
      initial={
        offsetsReady
          ? { opacity: 0, scale: 0.2, x: off.x, y: off.y }
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
        x: off.x,
        y: off.y,
        transition: {
          ...spring,
          delay: closeDelay,
          opacity: { delay: 0.05 },
        },
      }}
      transition={{
        ...spring,
        delay: openDelay,
      }}
    >
      {item.url ? (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="contents"
        >
          {content}
        </a>
      ) : (
        content
      )}
    </motion.div>
  );
}

export const ProjectAppGroup = ({
  title,
  items,
}: {
  title: string;
  items: ProjectAppItem[];
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const folderRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [itemOffsets, setItemOffsets] = useState<
    Record<string, { x: number; y: number }>
  >({});

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

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleExitComplete = useCallback(() => {
    if (!isOpen) {
      setItemOffsets({});
      setOrigin(null);
    }
  }, [isOpen]);

  // Calculate offsets for stagger animation - run after a frame to ensure refs are set
  useLayoutEffect(() => {
    if (!isOpen || !origin) return;

    // Wait for next frame so refs are populated
    const frame = requestAnimationFrame(() => {
      const next: Record<string, { x: number; y: number }> = {};
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
      <MotionConfig transition={spring}>
        <div className="project-app-group">
          {/* Always render to prevent layout shift, animate opacity */}
          <motion.div
            initial={false}
            animate={{ opacity: isOpen ? 0 : 1, scale: isOpen ? 0.9 : 1 }}
            transition={spring}
          >
            <Dialog.Trigger
              className="closed-root"
              onClick={handleOpen}
              style={{ pointerEvents: isOpen ? "none" : "auto" }}
            >
              <div className="folder-preview" ref={folderRef}>
                <div className="folder-grid">
                  {items.slice(0, 4).map((item) => (
                    <div key={item.key} className="mini-cell">
                      <img
                        className="h-full w-full"
                        src={item.iconSrc}
                        alt={item.name}
                        draggable={false}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="folder-name">{title}</div>
            </Dialog.Trigger>
          </motion.div>
        </div>

        <AnimatePresence onExitComplete={handleExitComplete}>
          {isOpen && (
            <Dialog.Portal keepMounted>
              <Dialog.Backdrop
                render={
                  <motion.div
                    className="open-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { delay: 0.025 } }}
                  />
                }
                onClick={handleClose}
              />
              <Dialog.Popup
                render={
                  <motion.div
                    className="open-folder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                }
              >
                <motion.div
                  className="open-title"
                  initial={{ opacity: 0, y: 30, x: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                  exit={{
                    opacity: 0,
                    y: 30,
                    x: 10,
                    scale: 0.8,
                    transition: { ...spring, stiffness: 300 },
                  }}
                  transition={{ ...spring, damping: 19 }}
                >
                  <Dialog.Title>{title}</Dialog.Title>
                </motion.div>

                <div className="open-grid">
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
