"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";

/**
 * ==============   Types   ================
 */

export type ProjectAppItem = {
  key: string;
  name: string;
  iconSrc: string;
  url?: string;
};

/**
 * ==============   Components   ================
 */

export const ProjectApp = ({
  name,
  iconSrc,
  url,
}: {
  name: string;
  iconSrc: string;
  url: string;
}) => {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="project-app"
    >
      <div className="project-app-icon">
        <img
          className="h-full w-full"
          src={iconSrc}
          alt={name}
          draggable={false}
        />
      </div>
      <span className="project-app-label">{name}</span>
    </a>
  );
};

const AppTile = ({ iconSrc, label }: { iconSrc: string; label: string }) => {
  return (
    <img
      className="h-full w-full"
      src={iconSrc}
      alt={label}
      aria-label={label}
      draggable={false}
    />
  );
};

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
  itemOffsets: Record<string, { x: number; y: number }>;
  offsetsReady: boolean;
}) => {
  const off = itemOffsets[item.key] ?? { x: 0, y: 0 };

  const openDelay = offsetsReady ? idx * 0.025 : 0;
  const closeDelay = offsetsReady ? 0.05 : 0;

  const content = (
    <>
      <div className="open-tile-box">
        <AppTile iconSrc={item.iconSrc} label={item.name} />
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
        offsetsReady ? { opacity: 1, scale: 1, x: 0, y: 0 } : { opacity: 0 }
      }
      exit={{
        opacity: 0,
        scale: 0.2,
        x: off.x,
        y: off.y,
        transition: {
          type: "spring",
          stiffness: 200,
          damping: 22,
          delay: closeDelay,
          opacity: { delay: 0.05 },
        },
      }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 22,
        delay: openDelay,
      }}
    >
      {item.url ? (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="contents"
        >
          {content}
        </a>
      ) : (
        content
      )}
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
  const layoutSpring = {
    type: "spring",
    stiffness: 200,
    damping: 22,
    bounce: 0,
  } as const;

  const [isOpen, setIsOpen] = useState(false);
  const folderRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [itemOffsets, setItemOffsets] = useState<
    Record<string, { x: number; y: number }>
  >({});

  const openFolder = useCallback(() => {
    const rect = folderRef.current?.getBoundingClientRect();
    if (rect) {
      setOrigin({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }
    setIsOpen(true);
  }, []);

  const closeFolder = useCallback(() => {
    setIsOpen(false);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !origin) return;
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
  }, [isOpen, origin, items]);

  const offsetsReady =
    isOpen && origin && Object.keys(itemOffsets).length === items.length;

  return (
    <MotionConfig transition={layoutSpring}>
      <div className="project-app-group">
        <AnimatePresence
          mode="popLayout"
          initial={false}
          onExitComplete={() => {
            if (!isOpen) {
              setItemOffsets({});
              setOrigin(null);
            }
          }}
        >
          {!isOpen ? (
            <motion.button
              key="closed"
              className="closed-root"
              onClick={openFolder}
              aria-label={`Open ${title} folder`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 22,
              }}
            >
              <div className="folder-preview" ref={folderRef}>
                <div className="folder-grid">
                  {items.slice(0, 4).map((item) => (
                    <div key={item.key} className="mini-cell">
                      <AppTile iconSrc={item.iconSrc} label={item.name} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="folder-name">{title}</div>
            </motion.button>
          ) : (
            <motion.button
              key="open"
              className="open-overlay"
              onClick={closeFolder}
              aria-label={`Close ${title} folder`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { delay: 0.025 } }}
            >
              <motion.div className="open-folder">
                <motion.div
                  className="open-title"
                  initial={{
                    opacity: 0,
                    y: 30,
                    x: 10,
                    scale: 0.8,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    x: 0,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    y: 30,
                    x: 10,
                    scale: 0.8,
                    transition: {
                      type: "spring",
                      stiffness: 300,
                      damping: 22,
                    },
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 19,
                  }}
                >
                  {title}
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
              </motion.div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
};
