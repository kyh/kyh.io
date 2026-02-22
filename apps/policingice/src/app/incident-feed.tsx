"use client";

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
import { useToast } from "@/components/toast";
import { authClient } from "@/lib/auth-client";
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

type Incident = Awaited<ReturnType<typeof getIncidents>>["incidents"][0];

type IncidentFeedProps = {
  initialIncidents: Incident[];
  initialNextOffset: number | undefined;
  initialUserVotes: Record<number, "unjustified" | "justified">;
  isAdmin: boolean;
}

export const IncidentFeed = ({
  initialIncidents,
  initialNextOffset,
  initialUserVotes,
  isAdmin,
}: IncidentFeedProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string should become undefined
  const q = searchParams.get("q") || undefined;
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string should become undefined
  const start = searchParams.get("start") || undefined;
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string should become undefined
  const end = searchParams.get("end") || undefined;
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string should become undefined
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
  }, [error, router, q, start, end, toast]);

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
  const [searchResults, setSearchResults] = useState<Incident[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const searchFormRef = useRef<HTMLFormElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const allIncidents = [...initialIncidents, ...extraIncidents];
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- checking for any truthy search param
  const hasSearchParams = q || start || end;

  // Reset state when initial data changes
  const loaderKey = initialIncidents.map((i) => i.id).join(",");
  useEffect(() => {
    setExtraIncidents([]);
    setNextOffset(initialNextOffset);
    setUserVotes(initialUserVotes);
  }, [loaderKey, initialNextOffset, initialUserVotes]);

  // Search when URL params change
  useEffect(() => {
    if (!hasSearchParams) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    void searchIncidents({
      query: q,
      startDate: start,
      endDate: end,
    })
      .then((result) => setSearchResults(result.incidents as Incident[]))
      .finally(() => setIsSearching(false));
  }, [q, start, end, hasSearchParams]);

  const handleSearch = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const query = (formData.get("q") as string).trim();
      const startDate = formData.get("start") as string;
      const endDate = formData.get("end") as string;

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
              unjustified:
                cur.unjustified - (type === "unjustified" ? 1 : 0),
              justified:
                cur.justified - (type === "justified" ? 1 : 0),
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
              unjustified:
                cur.unjustified +
                (type === "unjustified" ? 1 : switching ? -1 : 0),
              justified:
                cur.justified +
                (type === "justified" ? 1 : switching ? -1 : 0),
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
    [userVotes, voteCounts, toast],
  );

  const getVoteCount = (
    incident: Incident,
    type: "unjustified" | "justified",
  ) => {
    const base =
      type === "unjustified"
        ? incident.unjustifiedCount
        : incident.justifiedCount;
    const extra = voteCounts[incident.id]?.[type] ?? 0;
    return base + extra;
  };

  const handleReport = useCallback(async (incidentId: number) => {
    await reportIncident({ incidentId });
    toast.success("Reported");
  }, [toast]);

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
    [router, toast],
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
    [router, toast],
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
    [router, toast],
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
    async (data: {
      location?: string;
      description?: string;
      incidentDate?: string;
    }) => {
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
      toast.success(
        result.merged ? "Added to existing incident" : "Added to feed",
      );
    },
    [router, toast],
  );

  return (
    <KeyboardShortcutsProvider>
      <main
        id="main-content"
        className="min-h-screen bg-white px-4 py-8 sm:px-6"
      >
        <div className="max-w-xl">
          <header className="mb-12">
            <div className="flex items-center justify-between">
              <h1 className="text-base font-normal">Policing ICE</h1>
              <Popover.Root open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                <Popover.Trigger
                  className="cursor-pointer text-neutral-400 hover:text-neutral-900"
                  aria-label="Search incidents"
                >
                  <Search className="h-4 w-4" />
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Positioner side="bottom" align="end" sideOffset={8}>
                    <Popover.Popup className="z-20 w-64 rounded border border-neutral-200 bg-white p-4">
                      <Form
                        ref={searchFormRef}
                        onSubmit={handleSearch}
                        className="space-y-3"
                      >
                        <Field.Root name="q">
                          <Field.Label className="mb-1 block text-xs text-neutral-500">
                            Location or description
                          </Field.Label>
                          <Field.Control
                            type="text"
                            defaultValue={q ?? ""}
                            placeholder="Minneapolis, arrest..."
                            className="w-full border-b border-neutral-300 bg-transparent py-1 text-sm focus:border-neutral-900 focus:outline-none"
                          />
                        </Field.Root>
                        <Field.Root name="start">
                          <Field.Label className="mb-1 block text-xs text-neutral-500">
                            From date
                          </Field.Label>
                          <Field.Control
                            type="date"
                            defaultValue={start ?? ""}
                            className="w-full border-b border-neutral-300 bg-transparent py-1 text-sm focus:border-neutral-900 focus:outline-none"
                          />
                        </Field.Root>
                        <Field.Root name="end">
                          <Field.Label className="mb-1 block text-xs text-neutral-500">
                            To date
                          </Field.Label>
                          <Field.Control
                            type="date"
                            defaultValue={end ?? ""}
                            className="w-full border-b border-neutral-300 bg-transparent py-1 text-sm focus:border-neutral-900 focus:outline-none"
                          />
                        </Field.Root>
                        <button
                          type="submit"
                          disabled={isSearching}
                          className="w-full cursor-pointer text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-900 disabled:opacity-50"
                        >
                          {isSearching ? "Searching..." : "Search"}
                        </button>
                      </Form>
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </Popover.Root>
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              Documenting incidents of ICE overreach.{" "}
              <button
                onClick={() => setIsModalOpen(true)}
                className="cursor-pointer text-neutral-500 underline underline-offset-2 hover:text-neutral-900"
                aria-label="Submit a new incident"
              >
                Submit
              </button>
            </p>
          </header>

          {searchResults !== null && (
            <div className="mb-6 flex items-center gap-2 text-sm">
              <span className="text-neutral-500">
                {searchResults.length} result
                {searchResults.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={clearSearch}
                className="inline-flex cursor-pointer items-center gap-1 text-neutral-400 hover:text-neutral-900"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            </div>
          )}

          {(searchResults ?? allIncidents).length === 0 ? (
            <p className="text-sm text-neutral-500">
              {searchResults !== null
                ? "No results found."
                : "No incidents yet."}
            </p>
          ) : (
            <div className="divide-y divide-neutral-200">
              {(searchResults ?? allIncidents).map((incident) => {
                const unjustifiedCount = getVoteCount(incident, "unjustified");
                const justifiedCount = getVoteCount(incident, "justified");
                const userVote = userVotes[incident.id];

                return (
                  <LazyIncidentCard key={incident.id} incidentId={incident.id}>
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
                            className="cursor-pointer text-neutral-400 hover:text-neutral-900"
                            aria-label="Incident actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Menu.Trigger>
                          <Menu.Portal>
                            <Menu.Positioner
                              side="bottom"
                              align="end"
                              sideOffset={6}
                            >
                              <Menu.Popup className="z-10 min-w-32 rounded border border-neutral-200 bg-white py-1 text-sm">
                                <Menu.Item
                                  className="block w-full px-3 py-1.5 text-left hover:bg-neutral-50 data-[highlighted]:bg-neutral-50"
                                  render={
                                    <Link
                                      href={`/incident/${incident.id}`}
                                    />
                                  }
                                >
                                  View
                                </Menu.Item>
                                <Menu.Item
                                  className="block w-full cursor-pointer px-3 py-1.5 text-left hover:bg-neutral-50 data-[highlighted]:bg-neutral-50"
                                  onClick={() => setEditingIncident(incident)}
                                >
                                  Edit
                                </Menu.Item>
                                <Menu.Item
                                  className="block w-full cursor-pointer px-3 py-1.5 text-left text-red-600 hover:bg-neutral-50 data-[highlighted]:bg-neutral-50"
                                  onClick={() => handleReport(incident.id)}
                                >
                                  Report
                                </Menu.Item>
                                {isAdmin && (
                                  <>
                                    <Menu.Separator className="my-1 border-t border-neutral-200" />
                                    <Menu.Item
                                      className="block w-full cursor-pointer px-3 py-1.5 text-left hover:bg-neutral-50 data-[highlighted]:bg-neutral-50"
                                      onClick={() => handlePin(incident.id)}
                                    >
                                      {incident.pinned ? "Unpin" : "Pin"}
                                    </Menu.Item>
                                    <Menu.Item
                                      className="block w-full cursor-pointer px-3 py-1.5 text-left hover:bg-neutral-50 data-[highlighted]:bg-neutral-50"
                                      onClick={() => handleHide(incident.id)}
                                    >
                                      Hide
                                    </Menu.Item>
                                    <Menu.Item
                                      className="block w-full cursor-pointer px-3 py-1.5 text-left text-red-600 hover:bg-neutral-50 data-[highlighted]:bg-neutral-50"
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
            <div ref={loadMoreRef} className="py-8">
              {isLoading && (
                <span className="text-sm text-neutral-400">Loading...</span>
              )}
              {!nextOffset && allIncidents.length > 0 && (
                <span className="text-sm text-neutral-300">&mdash;</span>
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
}

const LazyIncidentCard = ({
  incidentId,
  children,
}: {
  incidentId: number;
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
    <article ref={ref} className="py-6 first:pt-0">
      {isVisible ? (
        children
      ) : (
        <div className="h-[300px] animate-pulse bg-neutral-50" />
      )}
    </article>
  );
}
