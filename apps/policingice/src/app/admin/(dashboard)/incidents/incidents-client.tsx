"use client";

import { useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Form } from "@base-ui/react/form";
import { useRouter } from "next/navigation";

import type { IncidentStatus, VideoPlatform } from "@/db/schema";
import { useToast } from "@/components/Toast";
import { VideoCarousel } from "@/components/VideoCarousel";
import {
  addVideo,
  adminDeleteIncident,
  deleteVideo,
  toggleIncidentPinned,
  toggleIncidentStatus,
  updateIncident,
  updateVideo,
} from "@/actions/admin";

import type { getAllIncidents } from "@/actions/admin";

type Incident = Awaited<ReturnType<typeof getAllIncidents>>[0];

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type IncidentEditRowProps = {
  incident: Incident;
  onCancel: () => void;
  onSaved: () => void;
}

const IncidentEditRow = ({
  incident,
  onCancel,
  onSaved,
}: IncidentEditRowProps) => {
  const router = useRouter();
  const toast = useToast();
  const newVideoRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await updateIncident({
      id: incident.id,
      location: (formData.get("location") as string).trim() || undefined,
      description:
        (formData.get("description") as string).trim() || undefined,
      incidentDate: (formData.get("incidentDate") as string) || undefined,
    });
    router.refresh();
    toast.success("Saved");
    onSaved();
  };

  const handleUpdateVideo = async (
    videoId: number,
    newUrl: string,
    originalUrl: string,
  ) => {
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
    <tr className="border-b border-neutral-100">
      <td className="py-3 pr-3">#{incident.id}</td>
      <td className="py-3 pr-3">
        <input
          type="text"
          name="location"
          form={formId}
          defaultValue={incident.location ?? ""}
          className="w-full border-b border-neutral-300 bg-transparent py-1 text-sm outline-none"
          placeholder="Location"
        />
      </td>
      <td className="py-3 pr-3">
        <input
          type="text"
          name="description"
          form={formId}
          defaultValue={incident.description ?? ""}
          className="w-full border-b border-neutral-300 bg-transparent py-1 text-sm outline-none"
          placeholder="Description"
        />
      </td>
      <td className="py-3 pr-3">
        <input
          type="date"
          name="incidentDate"
          form={formId}
          defaultValue={
            incident.incidentDate
              ? new Date(incident.incidentDate).toISOString().split("T")[0]
              : ""
          }
          className="border-b border-neutral-300 bg-transparent py-1 text-sm outline-none"
        />
      </td>
      <td className="py-3 pr-3">
        <span
          className={
            incident.status === "approved"
              ? "text-green-600"
              : "text-neutral-400"
          }
        >
          {incident.status}
        </span>
      </td>
      <td className="py-3 pr-3">
        {incident.pinned ? (
          <span className="text-blue-600">pinned</span>
        ) : (
          <span className="text-neutral-300">—</span>
        )}
      </td>
      <td className="py-3 pr-3">
        <div className="space-y-1">
          {incident.videos.map((video) => (
            <VideoEditInput
              key={video.id}
              video={video}
              onUpdate={handleUpdateVideo}
              onDelete={handleDeleteVideo}
            />
          ))}
          <div className="flex items-center gap-1">
            <input
              ref={newVideoRef}
              type="text"
              placeholder="Add video URL"
              className="w-48 border-b border-neutral-300 bg-transparent py-1 text-xs outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleAddVideo();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddVideo}
              className="cursor-pointer text-xs text-neutral-400 hover:text-neutral-900"
            >
              +
            </button>
          </div>
        </div>
      </td>
      <td className="py-3 pr-3 text-neutral-400">
        {incident.unjustifiedCount + incident.justifiedCount}
      </td>
      <td className="py-3 pr-3">
        {incident.reportCount > 0 ? (
          <span className="text-red-500">{incident.reportCount}</span>
        ) : (
          <span className="text-neutral-300">0</span>
        )}
      </td>
      <td className="py-3 text-neutral-400">
        <Form id={formId} onSubmit={handleSubmit} className="hidden" />
        <button
          type="submit"
          form={formId}
          className="cursor-pointer hover:text-neutral-900"
        >
          save
        </button>
        {" · "}
        <button
          onClick={onCancel}
          className="cursor-pointer hover:text-neutral-900"
        >
          cancel
        </button>
      </td>
    </tr>
  );
}

type VideoEditInputProps = {
  video: { id: number; url: string; platform: VideoPlatform };
  onUpdate: (id: number, newUrl: string, originalUrl: string) => void;
  onDelete: (id: number) => void;
}

const VideoEditInput = ({ video, onUpdate, onDelete }: VideoEditInputProps) => {
  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        defaultValue={video.url}
        onBlur={(e) => onUpdate(video.id, e.target.value, video.url)}
        className="w-48 border-b border-neutral-300 bg-transparent py-1 text-xs outline-none"
      />
      <button
        type="button"
        onClick={() => onDelete(video.id)}
        className="cursor-pointer text-xs text-red-400 hover:text-red-600"
      >
        ×
      </button>
    </div>
  );
}

type AdminIncidentsClientProps = {
  initialIncidents: Incident[];
}

export const AdminIncidentsClient = ({
  initialIncidents,
}: AdminIncidentsClientProps) => {
  const router = useRouter();
  const toast = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [previewingIncident, setPreviewingIncident] = useState<Incident | null>(
    null,
  );

  const handleToggleStatus = async (
    id: number,
    currentStatus: IncidentStatus,
  ) => {
    const result = await toggleIncidentStatus({ id, currentStatus });
    router.refresh();
    toast.success(result.newStatus === "approved" ? "Approved" : "Hidden");
  };

  const handleTogglePinned = async (id: number, currentPinned: boolean) => {
    const result = await toggleIncidentPinned({ id, currentPinned });
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
      <h2 className="mb-4 text-sm font-medium">
        All Incidents ({initialIncidents.length})
      </h2>

      {initialIncidents.length === 0 ? (
        <p className="text-sm text-neutral-500">No incidents.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-2 pr-3 font-normal">ID</th>
                <th className="py-2 pr-3 font-normal">Location</th>
                <th className="py-2 pr-3 font-normal">Description</th>
                <th className="py-2 pr-3 font-normal">Date</th>
                <th className="py-2 pr-3 font-normal">Status</th>
                <th className="py-2 pr-3 font-normal">Pinned</th>
                <th className="py-2 pr-3 font-normal">Videos</th>
                <th className="py-2 pr-3 font-normal">Votes</th>
                <th className="py-2 pr-3 font-normal">Reports</th>
                <th className="py-2 font-normal">Actions</th>
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
                  <tr key={incident.id} className="border-b border-neutral-100">
                    <td className="py-3 pr-3">#{incident.id}</td>
                    <td className="py-3 pr-3">{incident.location ?? "—"}</td>
                    <td
                      className="max-w-48 truncate py-3 pr-3"
                      title={incident.description ?? ""}
                    >
                      {incident.description ?? "—"}
                    </td>
                    <td className="py-3 pr-3">
                      {formatDate(incident.incidentDate)}
                    </td>
                    <td className="py-3 pr-3">
                      <button
                        onClick={() =>
                          handleToggleStatus(incident.id, incident.status)
                        }
                        className="cursor-pointer"
                      >
                        {incident.status === "approved" ? (
                          <span className="text-green-600">approved</span>
                        ) : (
                          <span className="text-neutral-400">hidden</span>
                        )}
                      </button>
                    </td>
                    <td className="py-3 pr-3">
                      <button
                        onClick={() =>
                          handleTogglePinned(incident.id, incident.pinned)
                        }
                        className="cursor-pointer"
                      >
                        {incident.pinned ? (
                          <span className="text-blue-600">pinned</span>
                        ) : (
                          <span className="text-neutral-300">—</span>
                        )}
                      </button>
                    </td>
                    <td className="py-3 pr-3">{incident.videos.length}</td>
                    <td className="py-3 pr-3 text-neutral-400">
                      {incident.unjustifiedCount + incident.justifiedCount}
                    </td>
                    <td className="py-3 pr-3">
                      {incident.reportCount > 0 ? (
                        <span className="text-red-500">
                          {incident.reportCount}
                        </span>
                      ) : (
                        <span className="text-neutral-300">0</span>
                      )}
                    </td>
                    <td className="py-3 text-neutral-400">
                      <button
                        onClick={() => setPreviewingIncident(incident)}
                        className="cursor-pointer hover:text-neutral-900"
                      >
                        preview
                      </button>
                      {" · "}
                      <button
                        onClick={() => setEditingId(incident.id)}
                        className="cursor-pointer hover:text-neutral-900"
                      >
                        edit
                      </button>
                      {" · "}
                      <button
                        onClick={() => handleDelete(incident.id)}
                        className="cursor-pointer hover:text-red-600"
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
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white p-6">
            <Dialog.Title className="sr-only">Preview incident</Dialog.Title>
            <Dialog.Close className="absolute top-4 right-4 cursor-pointer text-neutral-400 hover:text-neutral-900">
              ×
            </Dialog.Close>
            {previewingIncident && (
              <>
                <div className="mb-4 text-sm text-neutral-500">
                  #{previewingIncident.id}
                  {previewingIncident.location &&
                    ` · ${previewingIncident.location}`}
                  {previewingIncident.incidentDate &&
                    ` · ${formatDate(previewingIncident.incidentDate)}`}
                </div>
                <VideoCarousel videos={previewingIncident.videos} />
              </>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
