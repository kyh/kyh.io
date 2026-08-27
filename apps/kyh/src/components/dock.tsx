"use client";

import { theme as t } from "../styles/tokens.stylex";

import {
  fontSizeLineHeights,
  fontSizes,
  radii,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";

import * as stylex from "@stylexjs/stylex";

import type { MotionValue } from "motion/react";
import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useTheme } from "next-themes";

import { ThemeToggleIcon } from "@/components/theme-toggle";

const styles = stylex.create({
  shell: {
    pointerEvents: "none",
    position: "fixed",
    right: 0,
    bottom: "4vh",
    left: 0,
    zIndex: 10,
    display: "flex",
    height: "70px",
    alignItems: "center",
    justifyContent: "center",
  },
  bar: {
    pointerEvents: "auto",
    position: "relative",
    display: "flex",
    height: "100%",
    alignItems: "center",
    gap: spacing[2],
    borderRadius: "20px",
    backgroundColor: t.dockBg,
    padding: spacing[3],
    boxShadow: "rgba(15, 23, 42, 0.12) 0px 30px 60px 0px",
  },
  item: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    aspectRatio: "1 / 1",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "25%",
  },
  label: {
    backgroundColor: t.panel,
    position: "absolute",
    top: `calc(-1 * ${spacing[8]})`,
    left: "50%",
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: t.border,
    paddingInline: spacing[2],
    paddingBlock: spacing[0.5],
    fontSize: fontSizes.xs,
    lineHeight: fontSizeLineHeights.xs,
    whiteSpace: "pre",
    color: t.foreground,
  },
  iconWrap: { display: "flex", alignItems: "center", justifyContent: "center" },
  activeDot: {
    backgroundColor: t.foregroundFaded,
    position: "absolute",
    bottom: `calc(-1 * ${spacing[2]})`,
    left: "50%",
    height: "3px",
    width: "3px",
    translate: "-50% 0",
    animationName: "fadeInScaleX",
    animationDuration: "0.6s",
    animationTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
    borderRadius: radii.full,
  },
  glass: {
    position: "absolute",
    inset: 0,
    isolation: "isolate",
    zIndex: 0,
    overflow: "hidden",
    borderRadius: "20px",
    backdropFilter: "blur(8px)",
  },
});

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
    <div {...stylex.props(styles.shell)}>
      <nav
        {...stylex.props(styles.bar)}
        onMouseMove={(event) => mouseX.set(event.nativeEvent.x)}
        onMouseLeave={() => mouseX.set(Infinity)}
      >
        {links.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
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
          aria-label={themeLabel}
          onClick={() => setTheme(isLight ? "dark" : "light")}
          onMouseEnter={() => setHovered("theme")}
          onMouseLeave={() => setHovered(null)}
        >
          <DockItem label={themeLabel} mouseX={mouseX} hovered={hovered === "theme"}>
            <ThemeToggleIcon isLight={isLight} />
          </DockItem>
        </button>
        <GlassFilter />
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
    <motion.div
      ref={ref}
      style={{ width, height }}
      className={`dock-item ${stylex.props(styles.item).className}`}
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 2, x: "-50%" }}
            className={stylex.props(styles.label).className}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        style={{ width: widthIcon, height: heightIcon }}
        className={stylex.props(styles.iconWrap).className}
      >
        {children}
      </motion.div>
      {active && <div {...stylex.props(styles.activeDot)} />}
    </motion.div>
  );
};

const GlassFilter = () => {
  return (
    <>
      <div {...stylex.props(styles.glass)} style={{ filter: 'url("#glass-distortion")' }} />
      <svg style={{ display: "none", width: 0, height: 0 }}>
        <filter
          id="glass-distortion"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          filterUnits="objectBoundingBox"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.01 0.01"
            numOctaves="1"
            seed="5"
            result="turbulence"
          />
          <feComponentTransfer in="turbulence" result="mapped">
            <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
            <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
            <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
          </feComponentTransfer>
          <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
          <feSpecularLighting
            in="softMap"
            surfaceScale="5"
            specularConstant="1"
            specularExponent="100"
            lightingColor="white"
            result="specLight"
          >
            <fePointLight x="-200" y="-200" z="300" />
          </feSpecularLighting>
          <feComposite
            in="specLight"
            operator="arithmetic"
            k1="0"
            k2="1"
            k3="1"
            k4="0"
            result="litImage"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softMap"
            scale="150"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
    </>
  );
};
