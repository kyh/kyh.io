"use client";

import { theme } from "../app/styles/tokens.stylex";

import { up as mediaUp } from "@repo/tailwind-compat/media.stylex";

import {
  containers,
  fontSizeLineHeights,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";

import * as stylex from "@stylexjs/stylex";

import type useEmblaCarousel from "embla-carousel-react";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme";
import { useIsHydrated } from "@/lib/use-hydrated";

const styles = stylex.create({
  hud: {
    position: "fixed",
    right: spacing[4],
    bottom: spacing[4],
    display: { default: "none", [mediaUp.sm]: "block" },
    fontSize: fontSizes.xs,
    lineHeight: fontSizeLineHeights.xs,
    color: theme.mutedForeground,
  },
  topRow: {
    marginBottom: spacing[2],
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing[2],
  },
  linkish: {
    color: {
      default: null,
      "@media (hover: hover)": { default: null, ":hover": theme.foreground },
    },
  },
  pointer: { cursor: "pointer" },
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    backgroundColor: "color-mix(in oklab, #000 20%, transparent)",
  },
  popup: {
    position: "fixed",
    top: "15vh",
    left: "50%",
    zIndex: 50,
    width: "100%",
    maxWidth: containers.md,
    translate: "-50% 0",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: theme.border,
    backgroundColor: theme.background,
    padding: spacing[6],
  },
  dialogTitle: {
    fontSize: fontSizes.base,
    lineHeight: fontSizeLineHeights.base,
    fontWeight: fontWeights.medium,
  },
  dialogBody: {
    marginTop: spacing[3],
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
    color: theme.mutedForeground,
  },
  para: { marginBottom: spacing[3] },
  list: { marginBottom: spacing[3], listStyleType: "disc", paddingLeft: spacing[5] },
  listItem: { marginBottom: spacing[1] },
  close: {
    marginTop: spacing[4],
    cursor: "pointer",
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
    color: {
      default: theme.mutedForeground,
      "@media (hover: hover)": { default: theme.mutedForeground, ":hover": theme.foreground },
    },
    textDecorationLine: "underline",
    textUnderlineOffset: "2px",
  },
  sep: { color: "color-mix(in oklab, var(--muted-foreground) 40%, transparent)" },
  icon35: { height: spacing[3.5], width: spacing[3.5] },
  icon3: { height: spacing[3], width: spacing[3] },
  keyRow: { display: "flex", alignItems: "center", gap: spacing[3] },
  keyGroup: { display: "flex", alignItems: "center", gap: spacing[0.5] },
  kbd: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.default,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: theme.border,
    backgroundColor: theme.muted,
    padding: spacing[1],
  },
  ml1: { marginLeft: spacing[1] },
});

type EmblaApi = ReturnType<typeof useEmblaCarousel>[1];

type KeyboardShortcutsContextValue = {
  registerCarousel: (id: number, api: EmblaApi | null) => void;
  unregisterCarousel: (id: number) => void;
  registerIncident: (id: number, element: HTMLElement | null) => void;
  unregisterIncident: (id: number) => void;
  activeIncidentId: number | null;
};

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

export function useKeyboardShortcuts() {
  return useContext(KeyboardShortcutsContext);
}

type KeyboardShortcutsProviderProps = {
  children: ReactNode;
};

export const KeyboardShortcutsProvider = ({ children }: KeyboardShortcutsProviderProps) => {
  const carouselsRef = useRef<Map<number, EmblaApi | null>>(new Map());
  const incidentsRef = useRef<Map<number, HTMLElement>>(new Map());
  const incidentOrderRef = useRef<number[]>([]);
  const [activeIncidentId, setActiveIncidentId] = useState<number | null>(null);

  const registerCarousel = useCallback((id: number, api: EmblaApi | null) => {
    carouselsRef.current.set(id, api);
  }, []);

  const unregisterCarousel = useCallback((id: number) => {
    carouselsRef.current.delete(id);
  }, []);

  const registerIncident = useCallback(
    (id: number, element: HTMLElement | null) => {
      if (element) {
        incidentsRef.current.set(id, element);
        // Rebuild order based on DOM position
        const entries = Array.from(incidentsRef.current.entries());
        entries.sort((a, b) => {
          const rectA = a[1].getBoundingClientRect();
          const rectB = b[1].getBoundingClientRect();
          return rectA.top - rectB.top;
        });
        incidentOrderRef.current = entries.map(([id]) => id);

        // Set initial active if none
        if (activeIncidentId === null && incidentOrderRef.current.length > 0) {
          setActiveIncidentId(incidentOrderRef.current[0]);
        }
      }
    },
    [activeIncidentId],
  );

  const unregisterIncident = useCallback((id: number) => {
    incidentsRef.current.delete(id);
    incidentOrderRef.current = incidentOrderRef.current.filter((i) => i !== id);
  }, []);

  // Update active incident based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const viewportCenter = window.innerHeight / 3;
      let closestId: number | null = null;
      let closestDistance = Infinity;

      incidentsRef.current.forEach((element, id) => {
        const rect = element.getBoundingClientRect();
        const elementCenter = rect.top + rect.height / 2;
        const distance = Math.abs(elementCenter - viewportCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestId = id;
        }
      });

      // closestId is reassigned in the forEach loop above
      if (closestId !== null) {
        setActiveIncidentId(closestId);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      const order = incidentOrderRef.current;
      const currentIndex = activeIncidentId !== null ? order.indexOf(activeIncidentId) : -1;

      switch (e.key) {
        case "ArrowDown":
        case "j": {
          e.preventDefault();
          if (currentIndex < order.length - 1) {
            const nextId = order[currentIndex + 1];
            const element = incidentsRef.current.get(nextId);
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "start" });
              setActiveIncidentId(nextId);
            }
          }
          break;
        }
        case "ArrowUp":
        case "k": {
          e.preventDefault();
          if (currentIndex > 0) {
            const prevId = order[currentIndex - 1];
            const element = incidentsRef.current.get(prevId);
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "start" });
              setActiveIncidentId(prevId);
            }
          }
          break;
        }
        case "ArrowLeft":
        case "h": {
          if (activeIncidentId !== null) {
            const api = carouselsRef.current.get(activeIncidentId);
            if (api?.canScrollPrev()) {
              e.preventDefault();
              api.scrollPrev();
            }
          }
          break;
        }
        case "ArrowRight":
        case "l": {
          if (activeIncidentId !== null) {
            const api = carouselsRef.current.get(activeIncidentId);
            if (api?.canScrollNext()) {
              e.preventDefault();
              api.scrollNext();
            }
          }
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIncidentId]);

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        registerCarousel,
        unregisterCarousel,
        registerIncident,
        unregisterIncident,
        activeIncidentId,
      }}
    >
      {children}
      <KeyboardShortcutsHelp />
    </KeyboardShortcutsContext.Provider>
  );
};

const KeyboardShortcutsHelp = () => {
  const [aboutOpen, setAboutOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  // resolvedTheme is undefined on the server; render theme-dependent UI only
  // after hydration to avoid a mismatch.
  const isDark = useIsHydrated() && resolvedTheme === "dark";

  return (
    <div {...stylex.props(styles.hud)}>
      <div {...stylex.props(styles.topRow)}>
        <Dialog.Root open={aboutOpen} onOpenChange={setAboutOpen}>
          <Dialog.Trigger {...stylex.props(styles.pointer, styles.linkish)}>About</Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop {...stylex.props(styles.backdrop)} />
            <Dialog.Popup {...stylex.props(styles.popup)}>
              <Dialog.Title {...stylex.props(styles.dialogTitle)}>About Policing ICE</Dialog.Title>
              <Dialog.Description render={<div />} {...stylex.props(styles.dialogBody)}>
                <p {...stylex.props(styles.para)}>
                  Policing ICE is a community-driven platform for collecting and sharing video
                  documentation of U.S. Immigration and Customs Enforcement (ICE) activities.
                </p>
                <p {...stylex.props(styles.para)}>
                  Anyone can submit videos from social media platforms. Each submission is
                  categorized to be easily searchable by location, date, and description.
                </p>
                <p {...stylex.props(styles.para)}>
                  <strong>Features:</strong>
                </p>
                <ul {...stylex.props(styles.list)}>
                  <li {...stylex.props(styles.listItem)}>
                    Video submissions from Twitter/X, YouTube, TikTok, Instagram, Facebook, Reddit,
                    LinkedIn, and Pinterest
                  </li>
                  <li {...stylex.props(styles.listItem)}>Community voting on incidents</li>
                  <li {...stylex.props(styles.listItem)}>
                    Search by location, description, or date range
                  </li>
                  <li {...stylex.props(styles.listItem)}>
                    Anonymous participation - no account required
                  </li>
                  <li>Community moderation - incidents with 3+ reports are hidden</li>
                </ul>
              </Dialog.Description>
              <Dialog.Close {...stylex.props(styles.close)}>Close</Dialog.Close>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
        <span {...stylex.props(styles.sep)}>·</span>
        <a
          href="https://github.com/kyh/kyh.io/tree/main/apps/policingice"
          target="_blank"
          rel="noopener noreferrer"
          {...stylex.props(styles.linkish)}
        >
          GitHub
        </a>
        <span {...stylex.props(styles.sep)}>·</span>
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          {...stylex.props(styles.pointer, styles.linkish)}
          aria-label="Toggle theme"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? (
            <Sun {...stylex.props(styles.icon35)} />
          ) : (
            <Moon {...stylex.props(styles.icon35)} />
          )}
        </button>
      </div>
      <div {...stylex.props(styles.keyRow)}>
        <span {...stylex.props(styles.keyGroup)}>
          <kbd {...stylex.props(styles.kbd)}>
            <ArrowUp {...stylex.props(styles.icon3)} />
          </kbd>
          <kbd {...stylex.props(styles.kbd)}>
            <ArrowDown {...stylex.props(styles.icon3)} />
          </kbd>
          <span {...stylex.props(styles.ml1)}>navigate</span>
        </span>
        <span {...stylex.props(styles.keyGroup)}>
          <kbd {...stylex.props(styles.kbd)}>
            <ArrowLeft {...stylex.props(styles.icon3)} />
          </kbd>
          <kbd {...stylex.props(styles.kbd)}>
            <ArrowRight {...stylex.props(styles.icon3)} />
          </kbd>
          <span {...stylex.props(styles.ml1)}>videos</span>
        </span>
      </div>
    </div>
  );
};
