"use client";

import { a11y } from "@repo/tailwind-compat/a11y.stylex";
import { feature } from "@repo/tailwind-compat/media.stylex";
import { leading } from "@repo/tailwind-compat/leading.stylex";
import { theme } from "../../../styles/tokens.stylex";

import {
  colors,
  containers,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";

import * as stylex from "@stylexjs/stylex";

import { useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Form } from "@base-ui/react/form";
import { useRouter } from "next/navigation";

import type { VideoPlatform } from "@/db/drizzle-schema";
import { toast } from "@/components/toast";
import { VideoCarousel } from "@/components/video-carousel";
import { formString } from "@/lib/form-utils";
import { formatDate } from "@/lib/format";
import {
  addVideo,
  adminDeleteIncident,
  deleteVideo,
  toggleIncidentPinned,
  toggleIncidentStatus,
  updateIncident,
  updateVideo,
} from "@/lib/admin-action";

import type { getAllIncidents } from "@/lib/admin-action";

const styles = stylex.create({
  row: { borderBottomWidth: 1, borderBottomStyle: "solid", borderColor: theme.border },
  headRow: {
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderColor: theme.border,
    textAlign: "left",
    color: theme.mutedForeground,
  },
  th: { paddingBlock: spacing[2], paddingRight: spacing[3], fontWeight: fontWeights.normal },
  thLast: { paddingBlock: spacing[2], fontWeight: fontWeights.normal },
  td: { paddingBlock: spacing[3], paddingRight: spacing[3] },
  tdMuted: { paddingBlock: spacing[3], paddingRight: spacing[3], color: theme.mutedForeground },
  tdLastMuted: { paddingBlock: spacing[3], color: theme.mutedForeground },
  tdTruncate: {
    maxWidth: spacing[48],
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    paddingBlock: spacing[3],
    paddingRight: spacing[3],
  },
  input: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderColor: theme.input,
    backgroundColor: "transparent",
    paddingBlock: spacing[1],
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    outline: "none",
  },
  inputAuto: {
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderColor: theme.input,
    backgroundColor: "transparent",
    paddingBlock: spacing[1],
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    outline: "none",
  },
  inputSmall: {
    width: spacing[48],
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderColor: theme.input,
    backgroundColor: "transparent",
    paddingBlock: spacing[1],
    fontSize: fontSizes.xs,
    lineHeight: leading.xs,
    outline: "none",
  },
  approved: { color: colors.green600 },
  pinned: { color: colors.blue600 },
  muted: { color: theme.mutedForeground },
  faint: { color: "color-mix(in oklab, var(--muted-foreground) 40%, transparent)" },
  danger: { color: theme.destructive },
  stack1: { marginBottom: { default: spacing[1], ":last-child": 0 } },
  row1: { display: "flex", alignItems: "center", gap: spacing[1] },
  linkXs: {
    cursor: "pointer",
    fontSize: fontSizes.xs,
    lineHeight: leading.xs,
    color: {
      default: theme.mutedForeground,
      [feature.hover]: { default: theme.mutedForeground, ":hover": theme.foreground },
    },
  },
  linkXsDanger: {
    cursor: "pointer",
    fontSize: fontSizes.xs,
    lineHeight: leading.xs,
    color: theme.destructive,
  },
  hidden: { display: "none" },
  action: {
    cursor: "pointer",
    color: {
      default: null,
      [feature.hover]: { default: null, ":hover": theme.foreground },
    },
  },
  actionDanger: {
    cursor: "pointer",
    color: {
      default: null,
      [feature.hover]: { default: null, ":hover": theme.destructive },
    },
  },
  pointer: { cursor: "pointer" },
  heading: {
    marginBottom: spacing[4],
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    fontWeight: fontWeights.medium,
  },
  mutedSm: {
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    color: theme.mutedForeground,
  },
  scroller: { overflowX: "auto" },
  table: {
    width: "100%",
    minWidth: "900px",
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    backgroundColor: "color-mix(in oklab, #000 50%, transparent)",
  },
  popup: {
    position: "fixed",
    top: "50%",
    left: "50%",
    zIndex: 50,
    maxHeight: "90vh",
    width: "100%",
    maxWidth: containers.xl,
    translate: "-50% -50%",
    overflowY: "auto",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: theme.border,
    backgroundColor: theme.background,
    padding: spacing[6],
  },
  close: {
    position: "absolute",
    top: spacing[4],
    right: spacing[4],
    cursor: "pointer",
    color: {
      default: theme.mutedForeground,
      [feature.hover]: { default: theme.mutedForeground, ":hover": theme.foreground },
    },
  },
  previewMeta: {
    marginBottom: spacing[4],
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    color: theme.mutedForeground,
  },
});

type Incident = Awaited<ReturnType<typeof getAllIncidents>>[0];

type IncidentEditRowProps = {
  incident: Incident;
  onCancel: () => void;
  onSaved: () => void;
};

const IncidentEditRow = ({ incident, onCancel, onSaved }: IncidentEditRowProps) => {
  const router = useRouter();
  const newVideoRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await updateIncident({
      id: incident.id,
      location: formString(formData, "location").trim() || undefined,
      description: formString(formData, "description").trim() || undefined,
      incidentDate: formString(formData, "incidentDate") || undefined,
    });
    router.refresh();
    toast.success("Saved");
    onSaved();
  };

  const handleUpdateVideo = async (videoId: number, newUrl: string, originalUrl: string) => {
    if (newUrl && newUrl !== originalUrl) {
      await updateVideo({ id: videoId, url: newUrl });
      router.refresh();
      toast.success("Video updated");
    }
  };

  const handleAddVideo = async () => {
    const url = newVideoRef.current?.value.trim();
    if (!url) return;
    await addVideo({ incidentId: incident.id, url });
    if (newVideoRef.current) newVideoRef.current.value = "";
    router.refresh();
    toast.success("Video added");
  };

  const handleDeleteVideo = async (videoId: number) => {
    await deleteVideo({ id: videoId });
    router.refresh();
    toast.success("Video deleted");
  };

  const formId = `edit-${incident.id}`;

  return (
    <tr {...stylex.props(styles.row)}>
      <td {...stylex.props(styles.td)}>#{incident.id}</td>
      <td {...stylex.props(styles.td)}>
        <input
          type="text"
          name="location"
          form={formId}
          defaultValue={incident.location ?? ""}
          {...stylex.props(styles.input)}
          placeholder="Location"
        />
      </td>
      <td {...stylex.props(styles.td)}>
        <input
          type="text"
          name="description"
          form={formId}
          defaultValue={incident.description ?? ""}
          {...stylex.props(styles.input)}
          placeholder="Description"
        />
      </td>
      <td {...stylex.props(styles.td)}>
        <input
          type="date"
          name="incidentDate"
          form={formId}
          defaultValue={
            incident.incidentDate ? new Date(incident.incidentDate).toISOString().split("T")[0] : ""
          }
          {...stylex.props(styles.inputAuto)}
        />
      </td>
      <td {...stylex.props(styles.td)}>
        <span {...stylex.props(incident.status === "approved" ? styles.approved : styles.muted)}>
          {incident.status}
        </span>
      </td>
      <td {...stylex.props(styles.td)}>
        {incident.pinned ? (
          <span {...stylex.props(styles.pinned)}>pinned</span>
        ) : (
          <span {...stylex.props(styles.faint)}>—</span>
        )}
      </td>
      <td {...stylex.props(styles.td)}>
        <div>
          {incident.videos.map((video) => (
            <VideoEditInput
              key={video.id}
              video={video}
              onUpdate={handleUpdateVideo}
              onDelete={handleDeleteVideo}
            />
          ))}
          <div {...stylex.props(styles.row1)}>
            <input
              ref={newVideoRef}
              type="text"
              placeholder="Add video URL"
              {...stylex.props(styles.inputSmall)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleAddVideo();
                }
              }}
            />
            <button type="button" onClick={handleAddVideo} {...stylex.props(styles.linkXs)}>
              +
            </button>
          </div>
        </div>
      </td>
      <td {...stylex.props(styles.tdMuted)}>
        {incident.unjustifiedCount + incident.justifiedCount}
      </td>
      <td {...stylex.props(styles.td)}>
        {incident.reportCount > 0 ? (
          <span {...stylex.props(styles.danger)}>{incident.reportCount}</span>
        ) : (
          <span {...stylex.props(styles.faint)}>0</span>
        )}
      </td>
      <td {...stylex.props(styles.tdLastMuted)}>
        <Form id={formId} onSubmit={handleSubmit} {...stylex.props(styles.hidden)} />
        <button type="submit" form={formId} {...stylex.props(styles.action)}>
          save
        </button>
        {" · "}
        <button type="button" onClick={onCancel} {...stylex.props(styles.action)}>
          cancel
        </button>
      </td>
    </tr>
  );
};

type VideoEditInputProps = {
  video: { id: number; url: string; platform: VideoPlatform };
  onUpdate: (id: number, newUrl: string, originalUrl: string) => void;
  onDelete: (id: number) => void;
};

const VideoEditInput = ({ video, onUpdate, onDelete }: VideoEditInputProps) => {
  return (
    <div {...stylex.props(styles.row1, styles.stack1)}>
      <input
        type="text"
        defaultValue={video.url}
        onBlur={(e) => onUpdate(video.id, e.target.value, video.url)}
        {...stylex.props(styles.inputSmall)}
      />
      <button
        type="button"
        onClick={() => onDelete(video.id)}
        {...stylex.props(styles.linkXsDanger)}
      >
        ×
      </button>
    </div>
  );
};

type AdminIncidentsClientProps = {
  initialIncidents: Incident[];
};

export const AdminIncidentsClient = ({ initialIncidents }: AdminIncidentsClientProps) => {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [previewingIncident, setPreviewingIncident] = useState<Incident | null>(null);

  const handleToggleStatus = async (id: number) => {
    const result = await toggleIncidentStatus({ id });
    if (!result.success) {
      toast.error("Failed to update status");
      return;
    }
    router.refresh();
    toast.success(result.newStatus === "approved" ? "Approved" : "Hidden");
  };

  const handleTogglePinned = async (id: number) => {
    const result = await toggleIncidentPinned({ id });
    if (!result.success) {
      toast.error("Failed to pin");
      return;
    }
    router.refresh();
    toast.success(result.newPinned ? "Pinned" : "Unpinned");
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this incident?")) return;
    await adminDeleteIncident({ id });
    router.refresh();
    toast.success("Deleted");
  };

  return (
    <div>
      <h2 {...stylex.props(styles.heading)}>All Incidents ({initialIncidents.length})</h2>

      {initialIncidents.length === 0 ? (
        <p {...stylex.props(styles.mutedSm)}>No incidents.</p>
      ) : (
        <div {...stylex.props(styles.scroller)}>
          <table {...stylex.props(styles.table)}>
            <thead>
              <tr {...stylex.props(styles.headRow)}>
                <th {...stylex.props(styles.th)}>ID</th>
                <th {...stylex.props(styles.th)}>Location</th>
                <th {...stylex.props(styles.th)}>Description</th>
                <th {...stylex.props(styles.th)}>Date</th>
                <th {...stylex.props(styles.th)}>Status</th>
                <th {...stylex.props(styles.th)}>Pinned</th>
                <th {...stylex.props(styles.th)}>Videos</th>
                <th {...stylex.props(styles.th)}>Votes</th>
                <th {...stylex.props(styles.th)}>Reports</th>
                <th {...stylex.props(styles.thLast)}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialIncidents.map((incident) =>
                editingId === incident.id ? (
                  <IncidentEditRow
                    key={incident.id}
                    incident={incident}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => setEditingId(null)}
                  />
                ) : (
                  <tr key={incident.id} {...stylex.props(styles.row)}>
                    <td {...stylex.props(styles.td)}>#{incident.id}</td>
                    <td {...stylex.props(styles.td)}>{incident.location ?? "—"}</td>
                    <td {...stylex.props(styles.tdTruncate)} title={incident.description ?? ""}>
                      {incident.description ?? "—"}
                    </td>
                    <td {...stylex.props(styles.td)}>{formatDate(incident.incidentDate) ?? "—"}</td>
                    <td {...stylex.props(styles.td)}>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(incident.id)}
                        {...stylex.props(styles.pointer)}
                      >
                        {incident.status === "approved" ? (
                          <span {...stylex.props(styles.approved)}>approved</span>
                        ) : (
                          <span {...stylex.props(styles.muted)}>hidden</span>
                        )}
                      </button>
                    </td>
                    <td {...stylex.props(styles.td)}>
                      <button
                        type="button"
                        onClick={() => handleTogglePinned(incident.id)}
                        {...stylex.props(styles.pointer)}
                      >
                        {incident.pinned ? (
                          <span {...stylex.props(styles.pinned)}>pinned</span>
                        ) : (
                          <span {...stylex.props(styles.faint)}>—</span>
                        )}
                      </button>
                    </td>
                    <td {...stylex.props(styles.td)}>{incident.videos.length}</td>
                    <td {...stylex.props(styles.tdMuted)}>
                      {incident.unjustifiedCount + incident.justifiedCount}
                    </td>
                    <td {...stylex.props(styles.td)}>
                      {incident.reportCount > 0 ? (
                        <span {...stylex.props(styles.danger)}>{incident.reportCount}</span>
                      ) : (
                        <span {...stylex.props(styles.faint)}>0</span>
                      )}
                    </td>
                    <td {...stylex.props(styles.tdLastMuted)}>
                      <button
                        type="button"
                        onClick={() => setPreviewingIncident(incident)}
                        {...stylex.props(styles.action)}
                      >
                        preview
                      </button>
                      {" · "}
                      <button
                        type="button"
                        onClick={() => setEditingId(incident.id)}
                        {...stylex.props(styles.action)}
                      >
                        edit
                      </button>
                      {" · "}
                      <button
                        type="button"
                        onClick={() => handleDelete(incident.id)}
                        {...stylex.props(styles.actionDanger)}
                      >
                        delete
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog.Root
        open={!!previewingIncident}
        onOpenChange={(open) => !open && setPreviewingIncident(null)}
      >
        <Dialog.Portal>
          <Dialog.Backdrop {...stylex.props(styles.backdrop)} />
          <Dialog.Popup {...stylex.props(styles.popup)}>
            <Dialog.Title {...stylex.props(a11y.srOnly)}>Preview incident</Dialog.Title>
            <Dialog.Close {...stylex.props(styles.close)}>×</Dialog.Close>
            {previewingIncident && (
              <>
                <div {...stylex.props(styles.previewMeta)}>
                  #{previewingIncident.id}
                  {previewingIncident.location && ` · ${previewingIncident.location}`}
                  {previewingIncident.incidentDate &&
                    ` · ${formatDate(previewingIncident.incidentDate) ?? "—"}`}
                </div>
                <VideoCarousel videos={previewingIncident.videos} />
              </>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};
