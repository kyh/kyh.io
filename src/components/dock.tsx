"use client";

import type { MotionValue } from "motion/react";
import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import { useTheme } from "next-themes";

import { ThemeToggleIcon } from "@/components/theme-toggle";
import styles from "./dock.module.css";

const iconAttrs = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ["aria-hidden"]: true,
  width: "100%",
  height: "100%",
};

const links = [
  {
    href: "/",
    label: "Home",
    icon: (
      <svg {...iconAttrs}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/about",
    label: "About",
    icon: (
      <svg {...iconAttrs}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    href: "/showcase",
    label: "Showcase",
    icon: (
      <svg {...iconAttrs}>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  },
];

export const Dock = () => {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const mouseX = useMotionValue(Infinity);
  const [hovered, setHovered] = useState<string | null>(null);

  const isLight = theme === "light";
  const themeLabel = `Switch to ${isLight ? "dark" : "light"} mode`;

  return (
    <div className={styles.container}>
      <nav
        className={styles.list}
        onMouseMove={(event) => mouseX.set(event.nativeEvent.x)}
        onMouseLeave={() => mouseX.set(Infinity)}
      >
        {links.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => {
              mouseX.set(Infinity);
              setHovered(null);
            }}
            onMouseEnter={() => setHovered(href)}
            onMouseLeave={() => setHovered(null)}
          >
            <DockItem
              key={href}
              label={label}
              mouseX={mouseX}
              active={pathname === href}
              hovered={hovered === href}
            >
              {icon}
            </DockItem>
          </Link>
        ))}
        <button
          onClick={() => setTheme(isLight ? "dark" : "light")}
          onMouseEnter={() => setHovered("theme")}
          onMouseLeave={() => setHovered(null)}
        >
          <DockItem
            label={themeLabel}
            mouseX={mouseX}
            hovered={hovered === "theme"}
          >
            <ThemeToggleIcon isLight={isLight} />
          </DockItem>
        </button>
      </nav>
    </div>
  );
};

const itemWidth = 48;
const itemWidthMax = itemWidth * 1.5;
const iconWidth = itemWidth / 2;
const iconWidthMax = iconWidth * 1.5;

const DockItem = ({
  children,
  label,
  mouseX,
  active,
  hovered,
}: {
  children: React.ReactNode;
  label: string;
  mouseX: MotionValue;
  active?: boolean;
  hovered?: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return (val ?? 0) - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(
    distance,
    [-150, 0, 150],
    [itemWidth, itemWidthMax, itemWidth],
  );
  const heightTransform = useTransform(
    distance,
    [-150, 0, 150],
    [itemWidth, itemWidthMax, itemWidth],
  );

  const widthTransformIcon = useTransform(
    distance,
    [-150, 0, 150],
    [iconWidth, iconWidthMax, iconWidth],
  );
  const heightTransformIcon = useTransform(
    distance,
    [-150, 0, 150],
    [iconWidth, iconWidthMax, iconWidth],
  );

  const width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const widthIcon = useSpring(widthTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const heightIcon = useSpring(heightTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  return (
    <motion.div ref={ref} style={{ width, height }} className={styles.item}>
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 2, x: "-50%" }}
            className={styles.tooltip}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        style={{ width: widthIcon, height: heightIcon }}
        className={styles.iconContainer}
      >
        {children}
      </motion.div>
      {active && <div className={styles.activeDot} />}
    </motion.div>
  );
};
