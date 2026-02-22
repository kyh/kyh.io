"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { IncidentCardContent } from "@/components/incident-card-content";
import {
  KeyboardShortcutsProvider,
  useKeyboardShortcuts,
} from "@/components/keyboard-shortcuts-provider";
import { useToast } from "@/components/toast";
import { authClient } from "@/lib/auth-client";
import {
  getUserVote,
  reportIncident,
  submitVote,
} from "@/actions/incidents";

import type { getIncidents } from "@/actions/incidents";

type Incident = Awaited<ReturnType<typeof getIncidents>>["incidents"][0];

type IncidentDetailProps = {
  incident: Incident;
}

export const IncidentDetail = ({ incident }: IncidentDetailProps) => {
  const toast = useToast();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userVote, setUserVote] = useState<"unjustified" | "justified" | null>(
    null,
  );
  const [counts, setCounts] = useState({
    unjustified: incident.unjustifiedCount,
    justified: incident.justifiedCount,
  });
  const [reported, setReported] = useState(false);

  useEffect(() => {
    const initSession = async () => {
      let session = await authClient.getSession();
      if (!session.data) {
        await authClient.signIn.anonymous();
        session = await authClient.getSession();
      }
      if (session.data?.user.id) {
        setSessionId(session.data.user.id);
      }
    };
    void initSession();
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const loadVote = async () => {
      const voteType = await getUserVote({
        sessionId,
        incidentId: incident.id,
      });
      setUserVote(voteType);
    };
    void loadVote();
  }, [sessionId, incident.id]);

  const handleVote = useCallback(
    async (type: "unjustified" | "justified") => {
      const prevVote = userVote;
      const prevCounts = { ...counts };

      // Optimistic update
      if (prevVote === type) {
        setUserVote(null);
        setCounts((prev) => ({ ...prev, [type]: prev[type] - 1 }));
      } else if (prevVote) {
        setUserVote(type);
        setCounts((prev) => ({
          unjustified: prev.unjustified + (type === "unjustified" ? 1 : -1),
          justified: prev.justified + (type === "justified" ? 1 : -1),
        }));
      } else {
        setUserVote(type);
        setCounts((prev) => ({ ...prev, [type]: prev[type] + 1 }));
      }

      const result = await submitVote({ incidentId: incident.id, type });

      if (!result.success) {
        setUserVote(prevVote);
        setCounts(prevCounts);
        toast.error("Failed to vote");
      }
    },
    [incident.id, userVote, counts, toast],
  );

  const handleReport = useCallback(async () => {
    await reportIncident({ incidentId: incident.id });
    setReported(true);
    toast.success("Reported");
  }, [incident.id, toast]);

  return (
    <KeyboardShortcutsProvider>
      <main
        id="main-content"
        className="min-h-screen bg-white px-4 py-8 sm:px-6"
      >
        <div className="max-w-xl">
          <nav className="mb-12" aria-label="Breadcrumb">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-900"
              aria-label="Back to all incidents"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </Link>
          </nav>

          <IncidentArticle incidentId={incident.id}>
            <IncidentCardContent
              incidentId={incident.id}
              location={incident.location}
              incidentDate={incident.incidentDate}
              createdAt={incident.createdAt}
              videos={incident.videos}
              unjustifiedCount={counts.unjustified}
              justifiedCount={counts.justified}
              userVote={userVote}
              onVote={handleVote}
              onReport={handleReport}
              reported={reported}
            />
          </IncidentArticle>
        </div>
      </main>
    </KeyboardShortcutsProvider>
  );
}

const IncidentArticle = ({
  incidentId,
  children,
}: {
  incidentId: number;
  children: React.ReactNode;
}) => {
  const ref = useRef<HTMLElement>(null);
  const shortcuts = useKeyboardShortcuts();

  useEffect(() => {
    if (!shortcuts) return;
    shortcuts.registerIncident(incidentId, ref.current);
    return () => shortcuts.unregisterIncident(incidentId);
  }, [incidentId, shortcuts]);

  return <article ref={ref}>{children}</article>;
}
