"use client";

import { theme } from "./styles/tokens.stylex";

import { up as mediaUp } from "@repo/tailwind-compat/media.stylex";

import {
  animations,
  containers,
  fontSizeLineHeights,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";

import * as stylex from "@stylexjs/stylex";

import { useCallback, useEffect, useRef, useState } from "react";
import { Field } from "@base-ui/react/field";
import { Form } from "@base-ui/react/form";
import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Search, X } from "lucide-react";

import { IncidentCardContent } from "@/components/incident-card-content";
import { IncidentModal } from "@/components/incident-modal";
import {
  KeyboardShortcutsProvider,
  useKeyboardShortcuts,
} from "@/components/keyboard-shortcuts-provider";
import { toast } from "@/components/toast";
import { authClient } from "@/lib/auth-client";
import { formString } from "@/lib/form-utils";
import {
  addVideoToIncident,
  createIncident,
  deleteIncident,
  getIncidents,
  getUserVotes,
  hideIncident,
  reportIncident,
  searchIncidents,
  submitVote,
  togglePinIncident,
  updateIncidentDetails,
} from "@/lib/incident-action";

const styles = stylex.create({
  page: {
    minHeight: "100vh",
    backgroundColor: theme.background,
    paddingInline: { default: spacing[4], [mediaUp.sm]: spacing[6] },
    paddingBlock: spacing[8],
  },
  wrap: { maxWidth: containers.xl },
  header: { marginBottom: spacing[12] },
  headRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  title: {
    fontSize: fontSizes.base,
    lineHeight: fontSizeLineHeights.base,
    fontWeight: fontWeights.normal,
  },
  iconButton: {
    cursor: "pointer",
    color: {
      default: theme.mutedForeground,
      "@media (hover: hover)": { default: theme.mutedForeground, ":hover": theme.foreground },
    },
  },
  icon4: { height: spacing[4], width: spacing[4] },
  icon3: { height: spacing[3], width: spacing[3] },
  popover: {
    zIndex: 20,
    width: spacing[64],
    borderRadius: radii.default,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: theme.border,
    backgroundColor: theme.background,
    padding: spacing[4],
  },
  /** was `space-y-3`: a margin on every child but the last */
  stack3: { marginBottom: spacing[3] },
  fieldLabel: {
    marginBottom: spacing[1],
    display: "block",
    fontSize: fontSizes.xs,
    lineHeight: fontSizeLineHeights.xs,
    color: theme.mutedForeground,
  },
  input: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderColor: { default: theme.input, ":focus": theme.foreground },
    backgroundColor: "transparent",
    paddingBlock: spacing[1],
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
    outlineStyle: { default: null, ":focus": "none" },
  },
  searchSubmit: {
    width: "100%",
    cursor: "pointer",
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
    color: {
      default: theme.mutedForeground,
      "@media (hover: hover)": { default: theme.mutedForeground, ":hover": theme.foreground },
    },
    textDecorationLine: "underline",
    textUnderlineOffset: "2px",
    opacity: { default: null, ":disabled": 0.5 },
  },
  subtitle: {
    marginTop: spacing[1],
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
    color: theme.mutedForeground,
  },
  inlineLink: {
    cursor: "pointer",
    color: {
      default: theme.mutedForeground,
      "@media (hover: hover)": { default: theme.mutedForeground, ":hover": theme.foreground },
    },
    textDecorationLine: "underline",
    textUnderlineOffset: "2px",
  },
  filterRow: {
    marginBottom: spacing[6],
    display: "flex",
    alignItems: "center",
    gap: spacing[2],
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
  },
  muted: { color: theme.mutedForeground },
  mutedSm: {
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
    color: theme.mutedForeground,
  },
  clearButton: {
    display: "inline-flex",
    cursor: "pointer",
    alignItems: "center",
    gap: spacing[1],
    color: {
      default: theme.mutedForeground,
      "@media (hover: hover)": { default: theme.mutedForeground, ":hover": theme.foreground },
    },
  },
  /** was `divide-y divide-border`, a child combinator StyleX cannot express */
  divider: { borderBottomWidth: 1, borderBottomStyle: "solid", borderColor: theme.border },
  menuPopup: {
    zIndex: 10,
    minWidth: spacing[32],
    borderRadius: radii.default,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: theme.border,
    backgroundColor: theme.background,
    paddingBlock: spacing[1],
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
  },
  menuItem: {
    display: "block",
    width: "100%",
    paddingInline: spacing[3],
    paddingBlock: spacing[1.5],
    textAlign: "left",
    backgroundColor: {
      default: null,
      "@media (hover: hover)": { default: null, ":hover": theme.muted },
    },
  },
  menuItemPointer: { cursor: "pointer" },
  menuItemDanger: { color: theme.destructive },
  menuSeparator: {
    marginBlock: spacing[1],
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderColor: theme.border,
  },
  loadMore: { paddingBlock: spacing[8] },
  endMark: {
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
    color: "color-mix(in oklab, var(--muted-foreground) 40%, transparent)",
  },
  item: { paddingBlock: spacing[6], paddingTop: { default: spacing[6], ":first-child": 0 } },
  skeleton: { height: "300px", animation: animations.pulse, backgroundColor: theme.muted },
});

type Incident = Awaited<ReturnType<typeof getIncidents>>["incidents"][0];

type IncidentFeedProps = {
  initialIncidents: Incident[];
  initialNextOffset: number | undefined;
  initialUserVotes: Record<number, "unjustified" | "justified">;
  isAdmin: boolean;
};

export const IncidentFeed = ({
  initialIncidents,
  initialNextOffset,
  initialUserVotes,
  isAdmin,
}: IncidentFeedProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // `||` not `??` throughout: an empty param should read as undefined, not ""
  const q = searchParams.get("q") || undefined;
  const start = searchParams.get("start") || undefined;
  const end = searchParams.get("end") || undefined;
  const error = searchParams.get("error") || undefined;

  // Show error toast from share redirect
  useEffect(() => {
    if (error === "invalid_url") {
      toast.error(
        "No supported video URL found. Use Twitter, YouTube, TikTok, Facebook, Instagram, LinkedIn, Pinterest, or Reddit links.",
      );
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      router.replace(params.toString() ? `/?${params}` : "/");
    }
  }, [error, router, q, start, end]);

  const [extraIncidents, setExtraIncidents] = useState<Incident[]>([]);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userVotes, setUserVotes] = useState(initialUserVotes);
  const [voteCounts, setVoteCounts] = useState<
    Record<number, { unjustified: number; justified: number }>
  >({});
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [fetchedResults, setFetchedResults] = useState<Incident[] | null>(null);
  const [searchedFor, setSearchedFor] = useState<string | null>(null);

  const searchFormRef = useRef<HTMLFormElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const allIncidents = [...initialIncidents, ...extraIncidents];
  // `||` not `??`: any truthy search param counts
  const searchKey = q || start || end ? JSON.stringify([q, start, end]) : null;
  const searchResults = searchKey === null ? null : fetchedResults;
  const isSearching = searchKey !== null && searchedFor !== searchKey;

  const loaderKey = initialIncidents.map((i) => i.id).join(",");
  const [loadedKey, setLoadedKey] = useState(loaderKey);
  if (loadedKey !== loaderKey) {
    setLoadedKey(loaderKey);
    setExtraIncidents([]);
    setNextOffset(initialNextOffset);
    setUserVotes(initialUserVotes);
  }

  // Search when URL params change
  useEffect(() => {
    if (searchKey === null) return;
    void searchIncidents({
      query: q,
      startDate: start,
      endDate: end,
    })
      .then((result) => setFetchedResults(result.incidents))
      .finally(() => setSearchedFor(searchKey));
  }, [q, start, end, searchKey]);

  const handleSearch = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const query = formString(formData, "q").trim();
      const startDate = formString(formData, "start");
      const endDate = formString(formData, "end");

      if (!query && !startDate && !endDate) return;

      setIsSearchOpen(false);
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (startDate) params.set("start", startDate);
      if (endDate) params.set("end", endDate);
      router.push(`/?${params}`);
    },
    [router],
  );

  const clearSearch = useCallback(() => {
    searchFormRef.current?.reset();
    router.push("/");
  }, [router]);

  const loadMore = useCallback(async () => {
    if (!nextOffset || isLoading) return;
    setIsLoading(true);
    try {
      const result = await getIncidents({ offset: nextOffset });
      setExtraIncidents((prev) => [...prev, ...result.incidents]);
      setNextOffset(result.nextOffset);

      if (result.incidents.length > 0) {
        const newVotes = await getUserVotes({
          incidentIds: result.incidents.map((i) => i.id),
        });
        setUserVotes((prev) => ({ ...prev, ...newVotes }));
      }
    } finally {
      setIsLoading(false);
    }
  }, [nextOffset, isLoading]);

  // Infinite scroll
  useEffect(() => {
    const ref = loadMoreRef.current;
    if (!ref || searchResults !== null) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextOffset && !isLoading) {
          void loadMore();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(ref);
    return () => observer.disconnect();
  }, [nextOffset, isLoading, searchResults, loadMore]);

  const handleVote = useCallback(
    async (incidentId: number, type: "unjustified" | "justified") => {
      // Ensure user has session (creates anonymous if needed)
      const session = await authClient.getSession();
      if (!session.data) {
        await authClient.signIn.anonymous();
      }

      const prevVote = userVotes[incidentId];
      const prevCounts = voteCounts[incidentId] ?? {
        unjustified: 0,
        justified: 0,
      };

      // Optimistic update
      if (prevVote === type) {
        setUserVotes((prev) => {
          const next = { ...prev };
          delete next[incidentId];
          return next;
        });
        setVoteCounts((prev) => {
          const cur = prev[incidentId] ?? { unjustified: 0, justified: 0 };
          return {
            ...prev,
            [incidentId]: {
              unjustified: cur.unjustified - (type === "unjustified" ? 1 : 0),
              justified: cur.justified - (type === "justified" ? 1 : 0),
            },
          };
        });
      } else {
        setUserVotes((prev) => ({ ...prev, [incidentId]: type }));
        setVoteCounts((prev) => {
          const cur = prev[incidentId] ?? { unjustified: 0, justified: 0 };
          const switching = prevVote !== undefined;
          return {
            ...prev,
            [incidentId]: {
              unjustified: cur.unjustified + (type === "unjustified" ? 1 : switching ? -1 : 0),
              justified: cur.justified + (type === "justified" ? 1 : switching ? -1 : 0),
            },
          };
        });
      }

      const result = await submitVote({ incidentId, type });

      if (!result.success) {
        setUserVotes((prev) => ({ ...prev, [incidentId]: prevVote }));
        setVoteCounts((prev) => ({
          ...prev,
          [incidentId]: prevCounts,
        }));
        toast.error("Failed to vote");
      }
    },
    [userVotes, voteCounts],
  );

  const getVoteCount = (incident: Incident, type: "unjustified" | "justified") => {
    const base = type === "unjustified" ? incident.unjustifiedCount : incident.justifiedCount;
    const extra = voteCounts[incident.id]?.[type] ?? 0;
    return base + extra;
  };

  const handleReport = useCallback(async (incidentId: number) => {
    await reportIncident({ incidentId });
    toast.success("Reported");
  }, []);

  const handleHide = useCallback(
    async (incidentId: number) => {
      const result = await hideIncident({ incidentId });
      if (result.success) {
        toast.success("Hidden");
        router.refresh();
      } else {
        toast.error("Failed to hide");
      }
    },
    [router],
  );

  const handleDelete = useCallback(
    async (incidentId: number) => {
      if (!confirm("Delete this incident?")) return;
      const result = await deleteIncident({ incidentId });
      if (result.success) {
        toast.success("Deleted");
        router.refresh();
      } else {
        toast.error("Failed to delete");
      }
    },
    [router],
  );

  const handlePin = useCallback(
    async (incidentId: number) => {
      const result = await togglePinIncident({ incidentId });
      if (result.success) {
        toast.success(result.pinned ? "Pinned" : "Unpinned");
        router.refresh();
      } else {
        toast.error("Failed to pin");
      }
    },
    [router],
  );

  const handleAddVideo = useCallback(
    async (url: string) => {
      if (!editingIncident) return;
      await addVideoToIncident({ incidentId: editingIncident.id, url });
      router.refresh();
    },
    [editingIncident, router],
  );

  const handleUpdateIncident = useCallback(
    async (data: { location?: string; description?: string; incidentDate?: string }) => {
      if (!editingIncident) return;
      await updateIncidentDetails({ incidentId: editingIncident.id, ...data });
      router.refresh();
    },
    [editingIncident, router],
  );

  const handleSubmit = useCallback(
    async (data: {
      location?: string;
      description?: string;
      incidentDate?: string;
      videoUrls: string[];
    }) => {
      const result = await createIncident(data);
      if (result.autoApproved) {
        router.refresh();
      }
      toast.success(result.merged ? "Added to existing incident" : "Added to feed");
    },
    [router],
  );

  return (
    <KeyboardShortcutsProvider>
      <main id="main-content" {...stylex.props(styles.page)}>
        <div {...stylex.props(styles.wrap)}>
          <header {...stylex.props(styles.header)}>
            <div {...stylex.props(styles.headRow)}>
              <h1 {...stylex.props(styles.title)}>Policing ICE</h1>
              <Popover.Root open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                <Popover.Trigger {...stylex.props(styles.iconButton)} aria-label="Search incidents">
                  <Search {...stylex.props(styles.icon4)} />
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Positioner side="bottom" align="end" sideOffset={8}>
                    <Popover.Popup {...stylex.props(styles.popover)}>
                      <Form ref={searchFormRef} onSubmit={handleSearch}>
                        <Field.Root name="q" {...stylex.props(styles.stack3)}>
                          <Field.Label {...stylex.props(styles.fieldLabel)}>
                            Location or description
                          </Field.Label>
                          <Field.Control
                            type="text"
                            defaultValue={q ?? ""}
                            placeholder="Minneapolis, arrest..."
                            {...stylex.props(styles.input)}
                          />
                        </Field.Root>
                        <Field.Root name="start" {...stylex.props(styles.stack3)}>
                          <Field.Label {...stylex.props(styles.fieldLabel)}>From date</Field.Label>
                          <Field.Control
                            type="date"
                            defaultValue={start ?? ""}
                            {...stylex.props(styles.input)}
                          />
                        </Field.Root>
                        <Field.Root name="end" {...stylex.props(styles.stack3)}>
                          <Field.Label {...stylex.props(styles.fieldLabel)}>To date</Field.Label>
                          <Field.Control
                            type="date"
                            defaultValue={end ?? ""}
                            {...stylex.props(styles.input)}
                          />
                        </Field.Root>
                        <button
                          type="submit"
                          disabled={isSearching}
                          {...stylex.props(styles.searchSubmit)}
                        >
                          {isSearching ? "Searching..." : "Search"}
                        </button>
                      </Form>
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </Popover.Root>
            </div>
            <p {...stylex.props(styles.subtitle)}>
              Documenting incidents of ICE overreach.{" "}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                {...stylex.props(styles.inlineLink)}
                aria-label="Submit a new incident"
              >
                Submit
              </button>
            </p>
          </header>

          {searchResults !== null && (
            <div {...stylex.props(styles.filterRow)}>
              <span {...stylex.props(styles.muted)}>
                {searchResults.length} result
                {searchResults.length !== 1 ? "s" : ""}
              </span>
              <button type="button" onClick={clearSearch} {...stylex.props(styles.clearButton)}>
                <X {...stylex.props(styles.icon3)} />
                Clear
              </button>
            </div>
          )}

          {(searchResults ?? allIncidents).length === 0 ? (
            <p {...stylex.props(styles.mutedSm)}>
              {searchResults !== null ? "No results found." : "No incidents yet."}
            </p>
          ) : (
            <div>
              {(searchResults ?? allIncidents).map((incident, incidentIndex, list) => {
                const unjustifiedCount = getVoteCount(incident, "unjustified");
                const justifiedCount = getVoteCount(incident, "justified");
                const userVote = userVotes[incident.id];

                return (
                  <LazyIncidentCard
                    key={incident.id}
                    incidentId={incident.id}
                    isLast={incidentIndex === list.length - 1}
                  >
                    <IncidentCardContent
                      incidentId={incident.id}
                      location={incident.location}
                      incidentDate={incident.incidentDate}
                      createdAt={incident.createdAt}
                      videos={incident.videos}
                      unjustifiedCount={unjustifiedCount}
                      justifiedCount={justifiedCount}
                      userVote={userVote}
                      onVote={(type) => handleVote(incident.id, type)}
                      pinned={incident.pinned}
                      headerRight={
                        <Menu.Root>
                          <Menu.Trigger
                            {...stylex.props(styles.iconButton)}
                            aria-label="Incident actions"
                          >
                            <MoreHorizontal {...stylex.props(styles.icon4)} />
                          </Menu.Trigger>
                          <Menu.Portal>
                            <Menu.Positioner side="bottom" align="end" sideOffset={6}>
                              <Menu.Popup {...stylex.props(styles.menuPopup)}>
                                <Menu.Item
                                  className={`menu-item ${stylex.props(styles.menuItem).className}`}
                                  render={<Link href={`/incident/${incident.id}`} />}
                                >
                                  View
                                </Menu.Item>
                                <Menu.Item
                                  className={`menu-item ${stylex.props(styles.menuItem, styles.menuItemPointer).className}`}
                                  onClick={() => setEditingIncident(incident)}
                                >
                                  Edit
                                </Menu.Item>
                                <Menu.Item
                                  className={`menu-item ${stylex.props(styles.menuItem, styles.menuItemPointer, styles.menuItemDanger).className}`}
                                  onClick={() => handleReport(incident.id)}
                                >
                                  Report
                                </Menu.Item>
                                {isAdmin && (
                                  <>
                                    <Menu.Separator {...stylex.props(styles.menuSeparator)} />
                                    <Menu.Item
                                      className={`menu-item ${stylex.props(styles.menuItem, styles.menuItemPointer).className}`}
                                      onClick={() => handlePin(incident.id)}
                                    >
                                      {incident.pinned ? "Unpin" : "Pin"}
                                    </Menu.Item>
                                    <Menu.Item
                                      className={`menu-item ${stylex.props(styles.menuItem, styles.menuItemPointer).className}`}
                                      onClick={() => handleHide(incident.id)}
                                    >
                                      Hide
                                    </Menu.Item>
                                    <Menu.Item
                                      className={`menu-item ${stylex.props(styles.menuItem, styles.menuItemPointer, styles.menuItemDanger).className}`}
                                      onClick={() => handleDelete(incident.id)}
                                    >
                                      Delete
                                    </Menu.Item>
                                  </>
                                )}
                              </Menu.Popup>
                            </Menu.Positioner>
                          </Menu.Portal>
                        </Menu.Root>
                      }
                    />
                  </LazyIncidentCard>
                );
              })}
            </div>
          )}

          {searchResults === null && (
            <div ref={loadMoreRef} {...stylex.props(styles.loadMore)}>
              {isLoading && <span {...stylex.props(styles.mutedSm)}>Loading...</span>}
              {!nextOffset && allIncidents.length > 0 && (
                <span {...stylex.props(styles.endMark)}>&mdash;</span>
              )}
            </div>
          )}
        </div>

        <IncidentModal
          mode="create"
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
        />

        {editingIncident && (
          <IncidentModal
            mode="edit"
            isOpen={true}
            incident={{
              location: editingIncident.location,
              description: editingIncident.description,
              incidentDate: editingIncident.incidentDate,
              videos: editingIncident.videos,
            }}
            onClose={() => setEditingIncident(null)}
            onAddVideo={handleAddVideo}
            onUpdate={handleUpdateIncident}
          />
        )}
      </main>
    </KeyboardShortcutsProvider>
  );
};

const LazyIncidentCard = ({
  incidentId,
  isLast,
  children,
}: {
  incidentId: number;
  isLast: boolean;
  children: React.ReactNode;
}) => {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const shortcuts = useKeyboardShortcuts();

  useEffect(() => {
    if (!shortcuts) return;
    shortcuts.registerIncident(incidentId, ref.current);
    return () => shortcuts.unregisterIncident(incidentId);
  }, [incidentId, shortcuts]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <article ref={ref} {...stylex.props(styles.item, !isLast && styles.divider)}>
      {isVisible ? children : <div {...stylex.props(styles.skeleton)} />}
    </article>
  );
};
