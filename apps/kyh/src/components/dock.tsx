"use client";

import type { MotionValue } from "motion/react";
import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "motion/react";

import { iconAttrs } from "@/components/icons";
import { ThemeBloom } from "@/components/theme-bloom";
import { ThemeIcon } from "@/components/theme-icon";
import { discoverEgg } from "@/easter-eggs/store";
import { DEFAULT_THEME, themeOf } from "@/themes";
import { nextTap, toggleTheme, useAppearance } from "@/themes/store";

/** How long the theme toggle is held down to bloom the themes round it (ms). */
const HOLD_MS = 450;

const links = [
  {
    href: "/",
    icon: (
      <svg {...iconAttrs}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    label: "Home",
  },
  {
    href: "/showcase",
    icon: (
      <svg {...iconAttrs}>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
    label: "Showcase",
  },
];

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
    const bounds = ref.current?.getBoundingClientRect() ?? { width: 0, x: 0 };
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
    damping: 12,
    mass: 0.1,
    stiffness: 150,
  });
  const height = useSpring(heightTransform, {
    damping: 12,
    mass: 0.1,
    stiffness: 150,
  });

  const widthIcon = useSpring(widthTransformIcon, {
    damping: 12,
    mass: 0.1,
    stiffness: 150,
  });
  const heightIcon = useSpring(heightTransformIcon, {
    damping: 12,
    mass: 0.1,
    stiffness: 150,
  });

  return (
    <motion.div
      ref={ref}
      style={{ height, width }}
      className="dock-item relative z-[1] flex aspect-square items-center justify-center rounded-[25%]"
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: "-50%", y: 10 }}
            animate={{ opacity: 1, x: "-50%", y: 0 }}
            exit={{ opacity: 0, x: "-50%", y: 2 }}
            className="bg-panel absolute -top-8 left-1/2 rounded-md border border-[var(--border-color)] px-2 py-0.5 text-xs whitespace-pre text-[var(--body-color)]"
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        style={{ height: heightIcon, width: widthIcon }}
        className="flex items-center justify-center"
      >
        {children}
      </motion.div>
      {active && (
        <div className="bg-foreground-faded absolute -bottom-2 left-1/2 h-[3px] w-[3px] -translate-x-1/2 animate-[fadeInScaleX_0.6s_cubic-bezier(0.23,1,0.32,1)] rounded-full" />
      )}
    </motion.div>
  );
};

const GlassFilter = () => (
  <>
    <div
      className="pointer-events-none absolute inset-0 isolate -z-10 overflow-hidden rounded-[20px] backdrop-blur-[8px]"
      style={{ filter: 'url("#glass-distortion")' }}
    />
    <svg style={{ display: "none", height: 0, width: 0 }}>
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

export const Dock = () => {
  const pathname = usePathname();
  const appearance = useAppearance();
  const mouseX = useMotionValue(Infinity);
  const [hovered, setHovered] = useState<string | null>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [blooming, setBlooming] = useState(false);
  // A tap is light or dark; held down, the toggle blooms the themes, and the
  // release that ends the hold is no tap (whether it was is kept until the next press).
  const holding = useRef(0);
  const held = useRef(false);
  const bloom = () => {
    setHovered(null);
    // The dock settles back to rest under the themes, the toggle at its own size.
    mouseX.set(Infinity);
    setBlooming(true);
    discoverEgg("bloom");
  };
  const press = () => {
    held.current = false;
    window.clearTimeout(holding.current);
    holding.current = window.setTimeout(() => {
      held.current = true;
      bloom();
    }, HOLD_MS);
  };
  const release = () => window.clearTimeout(holding.current);

  const plain = appearance.theme === DEFAULT_THEME;
  // A tap flips light and dark, leaves a holiday for the visitor's own, and on
  // a holiday comes back round to it.
  const next = nextTap(appearance);
  const themeLabel =
    next.theme === DEFAULT_THEME
      ? `${plain ? "Switch to" : "Back to"} ${next.mode} mode`
      : `Switch to ${themeOf(next.theme).name}`;
  // Labels for a mouse only: a tap would leave one up, and a hold would sit under the themes.
  const hover = (event: React.PointerEvent, item: string) => {
    if (event.pointerType === "mouse" && !blooming) {
      setHovered(item);
    }
  };
  // The dock holds still while the themes are out over the toggle.
  const follow = (x: number) => {
    if (!blooming) {
      mouseX.set(x);
    }
  };

  return (
    <div className="pointer-events-none fixed right-0 bottom-[4vh] left-0 z-10 flex h-[70px] items-center justify-center">
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the pointer only magnifies the icons under it; nothing is activated by it */}
      <nav
        className="pointer-events-auto relative isolate flex h-full items-center gap-2 rounded-[20px] bg-[var(--dock-bg)] p-3 shadow-[0_30px_60px_0_var(--dock-shadow)]"
        onMouseMove={(event) => follow(event.nativeEvent.x)}
        onMouseLeave={() => follow(Infinity)}
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
            onPointerEnter={(event) => hover(event, href)}
            onPointerLeave={() => setHovered(null)}
          >
            <DockItem
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
          ref={toggle}
          type="button"
          aria-label={themeLabel}
          aria-haspopup="menu"
          aria-expanded={blooming}
          className="transition-transform duration-300 select-none active:scale-90 [-webkit-touch-callout:none]"
          onPointerDown={(event) => {
            if (event.button === 0) {
              press();
            }
          }}
          onPointerUp={release}
          onPointerLeave={() => {
            release();
            setHovered(null);
          }}
          onPointerCancel={release}
          // A finger lifting off a hold sends no click, which would land on the
          // theme opened under it. (A mouse's lands on no theme: it was pressed
          // on the toggle and released over the menu, so it goes to what holds both.)
          onTouchEnd={(event) => {
            if (held.current) {
              event.preventDefault();
            }
          }}
          // A long press on touch would open the browser's own menu.
          onContextMenu={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            held.current = false;
            // The keyboard's way to the themes, as a menu button opens with an arrow.
            if (event.key === "ArrowUp") {
              event.preventDefault();
              bloom();
            }
          }}
          onClick={() => {
            if (!held.current) {
              toggleTheme();
            }
          }}
          onPointerEnter={(event) => hover(event, "theme")}
        >
          <DockItem label={themeLabel} mouseX={mouseX} hovered={hovered === "theme"}>
            {/* Light and dark morph into each other; a holiday theme pops in wearing its glyph. */}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={plain ? "plain" : appearance.theme}
                className="flex size-full items-center justify-center"
                initial={{ opacity: 0, rotate: -40, scale: 0.4 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 40, scale: 0.4 }}
                transition={{ damping: 22, stiffness: 420, type: "spring" }}
              >
                <ThemeIcon appearance={appearance} look="glyph" />
              </motion.span>
            </AnimatePresence>
          </DockItem>
        </button>
        <ThemeBloom anchor={toggle} open={blooming} onOpenChange={setBlooming} />
        <GlassFilter />
      </nav>
    </div>
  );
};
