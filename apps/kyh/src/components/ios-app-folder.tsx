"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";

/**
 * ==============   Types   ================
 */

export type IosAppFolderItem = {
  key: string;
  layoutId?: string;
  name: string;
  iconSrc: string;
};

/**
 * ==============   Default Items   ================
 */

const defaultItems: IosAppFolderItem[] = [
  {
    key: "1",
    layoutId: "app-1",
    name: "App 1",
    iconSrc: "/favicon/favicon.svg",
  },
  {
    key: "2",
    layoutId: "app-2",
    name: "App 2",
    iconSrc: "/favicon/favicon.svg",
  },
  {
    key: "3",
    layoutId: "app-3",
    name: "App 3",
    iconSrc: "/favicon/favicon.svg",
  },
  {
    key: "4",
    layoutId: "app-4",
    name: "App 4",
    iconSrc: "/favicon/favicon.svg",
  },
  {
    key: "5",
    name: "App 5",
    iconSrc: "/favicon/favicon.svg",
  },
  {
    key: "6",
    name: "App 6",
    iconSrc: "/favicon/favicon.svg",
  },
  {
    key: "7",
    name: "App 7",
    iconSrc: "/favicon/favicon.svg",
  },
];

/**
 * ==============   Components   ================
 */

const AppTile = ({
  iconSrc,
  label,
  layoutId,
}: {
  iconSrc: string;
  label: string;
  layoutId?: string;
}) => {
  return (
    <motion.img
      className="h-full w-full will-change-transform"
      src={iconSrc}
      alt={label}
      aria-label={label}
      layoutId={layoutId}
      draggable={false}
    />
  );
};

const OpenGridItem = ({
  item,
  idx,
  items,
  itemRefs,
  itemOffsets,
  offsetsReady,
}: {
  item: IosAppFolderItem;
  idx: number;
  items: IosAppFolderItem[];
  itemRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  itemOffsets: Record<string, { x: number; y: number }>;
  offsetsReady: boolean;
}) => {
  const off = itemOffsets[item.key] ?? { x: 0, y: 0 };
  const hasLayout = Boolean(item.layoutId);

  const nonLayoutTotal = items.filter((i) => !i.layoutId).length;
  const nonLayoutIdx = items.slice(0, idx).filter((i) => !i.layoutId).length;

  const openDelay = offsetsReady
    ? item.layoutId
      ? 0
      : -0.025 + nonLayoutIdx * 0.025
    : 0;

  const closeDelay = offsetsReady
    ? item.layoutId
      ? 0
      : -0.095 + (nonLayoutTotal - 1 - nonLayoutIdx) * 0.025
    : 0;

  return (
    <motion.div
      className="open-item"
      ref={(el) => {
        itemRefs.current[item.key] = el;
      }}
      initial={
        hasLayout
          ? { opacity: 1 }
          : offsetsReady
            ? { opacity: 0, scale: 0.2, x: off.x, y: off.y }
            : { opacity: 0 }
      }
      animate={
        hasLayout
          ? { opacity: 1 }
          : offsetsReady
            ? { opacity: 1, scale: 1, x: 0, y: 0 }
            : { opacity: 0 }
      }
      exit={
        hasLayout
          ? { opacity: 1 }
          : {
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
            }
      }
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 22,
        delay: openDelay,
      }}
    >
      <div className="open-tile-box">
        <AppTile
          layoutId={item.layoutId}
          iconSrc={item.iconSrc}
          label={item.name}
        />
      </div>

      {hasLayout ? (
        <motion.div layoutId={`label-${item.layoutId}`} className="open-label">
          {item.name}
        </motion.div>
      ) : (
        <div className="open-label">{item.name}</div>
      )}
    </motion.div>
  );
};

export const IosAppFolder = ({
  title = "Creator Studio",
  items = defaultItems,
}: {
  title?: string;
  items?: IosAppFolderItem[];
}) => {
  const layoutSpring = {
    type: "spring",
    stiffness: 200,
    damping: 22,
    bounce: 0,
  } as const;

  const [isOpen, setIsOpen] = useState(false);
  const miniGridRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [itemOffsets, setItemOffsets] = useState<
    Record<string, { x: number; y: number }>
  >({});

  const openFolder = useCallback(() => {
    const rect = miniGridRef.current?.getBoundingClientRect();
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
      <div className="flex min-h-screen w-full items-center justify-center font-sans">
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
              <div className="folder-preview">
                <div className="folder-grid">
                  {items
                    .filter((item) => !item.layoutId)
                    .slice(0, 3)
                    .map((item) => (
                      <AppTile
                        key={item.key}
                        iconSrc={item.iconSrc}
                        label={item.name}
                      />
                    ))}

                  <div className="mini-grid" ref={miniGridRef}>
                    {items
                      .filter((item) => item.layoutId)
                      .slice(0, 4)
                      .map((item) => (
                        <div key={item.key} className="mini-cell">
                          <AppTile
                            layoutId={item.layoutId}
                            iconSrc={item.iconSrc}
                            label={item.name}
                          />
                          <motion.div
                            layoutId={`label-${item.layoutId}`}
                            className="mini-label"
                            style={{ opacity: 0 }}
                            aria-hidden="true"
                          >
                            {item.name}
                          </motion.div>
                        </div>
                      ))}
                  </div>
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
                      key={
                        item.layoutId
                          ? item.key
                          : `${item.key}-${offsetsReady ? "ready" : "wait"}`
                      }
                      item={item}
                      idx={idx}
                      items={items}
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
