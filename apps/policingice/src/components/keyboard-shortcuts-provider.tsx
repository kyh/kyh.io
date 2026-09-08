"use client";

import type useEmblaCarousel from "embla-carousel-react";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Dialog } from "@base-ui/react/dialog";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme";
import { useIsHydrated } from "@/lib/use-hydrated";

type EmblaApi = ReturnType<typeof useEmblaCarousel>[1];

interface KeyboardShortcutsContextValue {
  registerCarousel: (id: number, api: EmblaApi | null) => void;
  unregisterCarousel: (id: number) => void;
  registerIncident: (id: number, element: HTMLElement | null) => void;
  unregisterIncident: (id: number) => void;
  activeIncidentId: number | null;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

export const useKeyboardShortcuts = () => useContext(KeyboardShortcutsContext);

const KeyboardShortcutsHelp = () => {
  const [aboutOpen, setAboutOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  // resolvedTheme is undefined on the server; render theme-dependent UI only
  // after hydration to avoid a mismatch.
  const isDark = useIsHydrated() && resolvedTheme === "dark";

  return (
    <div className="fixed right-4 bottom-4 hidden text-xs text-muted-foreground sm:block">
      <div className="mb-2 flex items-center justify-end gap-2">
        <Dialog.Root open={aboutOpen} onOpenChange={setAboutOpen}>
          <Dialog.Trigger className="cursor-pointer hover:text-foreground">About</Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/20" />
            <Dialog.Popup className="fixed top-[15vh] left-1/2 z-50 w-full max-w-md -translate-x-1/2 border border-border bg-background p-6">
              <Dialog.Title className="text-base font-medium">About Policing ICE</Dialog.Title>
              <Dialog.Description render={<div />} className="mt-3 text-sm text-muted-foreground">
                <p className="mb-3">
                  Policing ICE is a community-driven platform for collecting and sharing video
                  documentation of U.S. Immigration and Customs Enforcement (ICE) activities.
                </p>
                <p className="mb-3">
                  Anyone can submit videos from social media platforms. Each submission is
                  categorized to be easily searchable by location, date, and description.
                </p>
                <p className="mb-3">
                  <strong>Features:</strong>
                </p>
                <ul className="mb-3 list-disc space-y-1 pl-5">
                  <li>
                    Video submissions from Twitter/X, YouTube, TikTok, Instagram, Facebook, Reddit,
                    LinkedIn, and Pinterest
                  </li>
                  <li>Community voting on incidents</li>
                  <li>Search by location, description, or date range</li>
                  <li>Anonymous participation - no account required</li>
                  <li>Community moderation - incidents with 3+ reports are hidden</li>
                </ul>
              </Dialog.Description>
              <Dialog.Close className="mt-4 cursor-pointer text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
                Close
              </Dialog.Close>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
        <span className="text-muted-foreground/40">·</span>
        <a
          href="https://github.com/kyh/kyh.io/tree/main/apps/policingice"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground"
        >
          GitHub
        </a>
        <span className="text-muted-foreground/40">·</span>
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="cursor-pointer hover:text-foreground"
          aria-label="Toggle theme"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-0.5">
          <kbd className="inline-flex items-center justify-center rounded border border-border bg-muted p-1">
            <ArrowUp className="h-3 w-3" />
          </kbd>
          <kbd className="inline-flex items-center justify-center rounded border border-border bg-muted p-1">
            <ArrowDown className="h-3 w-3" />
          </kbd>
          <span className="ml-1">navigate</span>
        </span>
        <span className="flex items-center gap-0.5">
          <kbd className="inline-flex items-center justify-center rounded border border-border bg-muted p-1">
            <ArrowLeft className="h-3 w-3" />
          </kbd>
          <kbd className="inline-flex items-center justify-center rounded border border-border bg-muted p-1">
            <ArrowRight className="h-3 w-3" />
          </kbd>
          <span className="ml-1">videos</span>
        </span>
      </div>
    </div>
  );
};

interface KeyboardShortcutsProviderProps {
  children: ReactNode;
}

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
        const entries = [...incidentsRef.current.entries()];
        entries.sort((a, b) => {
          const rectA = a[1].getBoundingClientRect();
          const rectB = b[1].getBoundingClientRect();
          return rectA.top - rectB.top;
        });
        incidentOrderRef.current = entries.map(([entryId]) => entryId);

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

      for (const [id, element] of incidentsRef.current) {
        const rect = element.getBoundingClientRect();
        const elementCenter = rect.top + rect.height / 2;
        const distance = Math.abs(elementCenter - viewportCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestId = id;
        }
      }

      if (closestId !== null) {
        setActiveIncidentId(closestId);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) =>
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable);

    const goToIncident = (index: number) => {
      const order = incidentOrderRef.current;
      if (index < 0 || index >= order.length) {
        return;
      }
      const id = order[index];
      const element = incidentsRef.current.get(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveIncidentId(id);
      }
    };

    const scrollCarousel = (e: KeyboardEvent, direction: "prev" | "next") => {
      const api = activeIncidentId === null ? null : carouselsRef.current.get(activeIncidentId);
      if (!api) {
        return;
      }
      if (direction === "prev" && api.canScrollPrev()) {
        e.preventDefault();
        api.scrollPrev();
      }
      if (direction === "next" && api.canScrollNext()) {
        e.preventDefault();
        api.scrollNext();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) {
        return;
      }

      const currentIndex =
        activeIncidentId === null ? -1 : incidentOrderRef.current.indexOf(activeIncidentId);

      switch (e.key) {
        case "ArrowDown":
        case "j": {
          e.preventDefault();
          goToIncident(currentIndex + 1);
          break;
        }
        case "ArrowUp":
        case "k": {
          e.preventDefault();
          goToIncident(currentIndex - 1);
          break;
        }
        case "ArrowLeft":
        case "h": {
          scrollCarousel(e, "prev");
          break;
        }
        case "ArrowRight":
        case "l": {
          scrollCarousel(e, "next");
          break;
        }
        default: {
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIncidentId]);

  const value = useMemo(
    () => ({
      activeIncidentId,
      registerCarousel,
      registerIncident,
      unregisterCarousel,
      unregisterIncident,
    }),
    [activeIncidentId, registerCarousel, registerIncident, unregisterCarousel, unregisterIncident],
  );

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
      <KeyboardShortcutsHelp />
    </KeyboardShortcutsContext.Provider>
  );
};
