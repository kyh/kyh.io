import { theme } from "../app/styles/tokens.stylex";
import {
  containers,
  fontSizeLineHeights,
  fontSizes,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Field } from "@base-ui/react/field";
import { Form } from "@base-ui/react/form";

import type { VideoPlatform } from "@/db/drizzle-schema";
import { toast } from "@/components/toast";
import { formString } from "@/lib/form-utils";
import { isValidVideoUrl } from "@/lib/video-utils";

const styles = stylex.create({
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
  srOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
    borderWidth: 0,
  },
  /** was `space-y-4` / `space-y-2` / `space-y-1`: a margin on every child but the last */
  stack4: { marginBottom: spacing[4] },
  stack2: { marginBottom: spacing[2] },
  stack1: { marginBottom: spacing[1] },
  label: {
    marginBottom: spacing[1],
    display: "block",
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
  },
  labelMuted: {
    marginBottom: spacing[2],
    display: "block",
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
    color: theme.mutedForeground,
  },
  row2: { display: "flex", gap: spacing[2] },
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
  textarea: {
    width: "100%",
    resize: "none",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderColor: { default: theme.input, ":focus": theme.foreground },
    backgroundColor: "transparent",
    paddingBlock: spacing[1],
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
    outlineStyle: { default: null, ":focus": "none" },
  },
  linkButton: {
    cursor: "pointer",
    fontSize: fontSizes.sm,
    lineHeight: fontSizeLineHeights.sm,
    color: {
      default: theme.mutedForeground,
      "@media (hover: hover)": { default: theme.mutedForeground, ":hover": theme.foreground },
    },
  },
  linkButtonSpaced: { marginTop: spacing[2] },
  disabledable: { opacity: { default: null, ":disabled": 0.5 } },
  fieldError: {
    marginTop: spacing[1],
    fontSize: fontSizes.xs,
    lineHeight: fontSizeLineHeights.xs,
    color: theme.destructive,
  },
  videoLine: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: fontSizes.xs,
    lineHeight: fontSizeLineHeights.xs,
    color: theme.mutedForeground,
  },
  actions: { display: "flex", gap: spacing[4], paddingTop: spacing[2] },
  submit: {
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
});

type Video = {
  id: number;
  url: string;
  platform: VideoPlatform;
};

type IncidentData = {
  location?: string;
  description?: string;
  incidentDate?: string;
  videoUrls?: string[];
};

type CreateModeProps = {
  mode: "create";
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: IncidentData & { videoUrls: string[] }) => Promise<void>;
};

type EditModeProps = {
  mode: "edit";
  isOpen: boolean;
  onClose: () => void;
  incident: {
    location: string | null;
    description: string | null;
    incidentDate: Date | null;
    videos: Video[];
  };
  onAddVideo: (url: string) => Promise<void>;
  onUpdate: (data: IncidentData) => Promise<void>;
};

type IncidentModalProps = CreateModeProps | EditModeProps;

export const IncidentModal = (props: IncidentModalProps) => {
  const { isOpen, onClose, mode } = props;

  const formRef = useRef<HTMLFormElement>(null);
  const addVideoRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoError, setVideoError] = useState("");

  // Video URL inputs for create mode
  const [inputKeys, setInputKeys] = useState([0]);
  const [urlErrors, setUrlErrors] = useState<Record<number, string>>({});
  const nextKeyRef = useRef(1);

  const handleClose = () => {
    formRef.current?.reset();
    setInputKeys([0]);
    nextKeyRef.current = 1;
    setUrlErrors({});
    setVideoError("");
    onClose();
  };

  // Create mode: video URL management
  const addVideoUrl = () => {
    setInputKeys([...inputKeys, nextKeyRef.current]);
    nextKeyRef.current++;
  };

  const removeVideoUrl = (key: number) => {
    setInputKeys(inputKeys.filter((k) => k !== key));
    setUrlErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validateUrl = (key: number, value: string) => {
    if (value.trim() && !isValidVideoUrl(value)) {
      setUrlErrors((prev) => ({
        ...prev,
        [key]: "Use a supported platform link",
      }));
    } else {
      setUrlErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Edit mode: add video
  const handleAddVideo = async () => {
    if (mode !== "edit") return;
    const url = addVideoRef.current?.value.trim();
    if (!url) return;

    if (!isValidVideoUrl(url)) {
      setVideoError("Use a supported platform link");
      return;
    }

    setIsSubmitting(true);
    setVideoError("");
    try {
      await props.onAddVideo(url);
      if (addVideoRef.current) addVideoRef.current.value = "";
      toast.success("Video added");
    } catch {
      toast.error("Failed to add video");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const location = formString(formData, "location").trim();
    const description = formString(formData, "description").trim();
    const incidentDate = formString(formData, "incidentDate");

    if (mode === "create") {
      const videoUrls = inputKeys
        .map((key) => formString(formData, `video-${key}`).trim())
        .filter((url) => url && isValidVideoUrl(url));

      if (videoUrls.length === 0) {
        setUrlErrors({
          [inputKeys[0]]: "At least one valid video URL required",
        });
        return;
      }

      setIsSubmitting(true);
      try {
        await props.onSubmit({
          location: location || undefined,
          description: description || undefined,
          incidentDate: incidentDate || undefined,
          videoUrls,
        });
        handleClose();
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setIsSubmitting(true);
      try {
        await props.onUpdate({
          location: location || undefined,
          description: description || undefined,
          incidentDate: incidentDate || undefined,
        });
        toast.success("Saved");
        onClose();
      } catch {
        toast.error("Failed to save");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const title = mode === "create" ? "Submit an incident" : "Edit incident";
  const submitText = mode === "create" ? "Submit" : "Save";
  const submittingText = mode === "create" ? "Submitting..." : "Saving...";

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop {...stylex.props(styles.backdrop)} />
        <Dialog.Popup {...stylex.props(styles.popup)}>
          <Dialog.Title {...stylex.props(styles.srOnly)}>{title}</Dialog.Title>
          <Form ref={formRef} onSubmit={handleSubmit}>
            {/* Video URLs - Create mode */}
            {mode === "create" && (
              <div {...stylex.props(styles.stack4)}>
                <label htmlFor="video-0" {...stylex.props(styles.label)}>
                  Video URLs
                </label>
                <div>
                  {inputKeys.map((key, index) => (
                    <Field.Root
                      key={key}
                      name={`video-${key}`}
                      {...stylex.props(index < inputKeys.length - 1 && styles.stack2)}
                    >
                      <div {...stylex.props(styles.row2)}>
                        <Field.Control
                          type="url"
                          onBlur={(e: React.FocusEvent<HTMLInputElement>) =>
                            validateUrl(key, e.target.value)
                          }
                          placeholder="https://x.com/..."
                          {...stylex.props(styles.input)}
                          aria-label={`Video URL ${index + 1}`}
                        />
                        {inputKeys.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeVideoUrl(key)}
                            {...stylex.props(styles.linkButton)}
                            aria-label={`Remove video URL ${index + 1}`}
                          >
                            ×
                          </button>
                        )}
                      </div>
                      {urlErrors[key] && (
                        <p {...stylex.props(styles.fieldError)}>{urlErrors[key]}</p>
                      )}
                    </Field.Root>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addVideoUrl}
                  {...stylex.props(styles.linkButton, styles.linkButtonSpaced)}
                >
                  + Add another
                </button>
              </div>
            )}

            {/* Existing videos - Edit mode */}
            {mode === "edit" && (
              <>
                <div {...stylex.props(styles.stack4)}>
                  <label {...stylex.props(styles.labelMuted)}>
                    Videos ({props.incident.videos.length})
                  </label>
                  <div>
                    {props.incident.videos.map((video, i) => (
                      <div
                        key={video.id}
                        {...stylex.props(
                          styles.videoLine,
                          i < props.incident.videos.length - 1 && styles.stack1,
                        )}
                      >
                        {video.platform}: {video.url}
                      </div>
                    ))}
                  </div>
                </div>

                <Field.Root name="add-video" {...stylex.props(styles.stack4)}>
                  <Field.Label {...stylex.props(styles.label)}>Add Video</Field.Label>
                  <Field.Control
                    ref={addVideoRef}
                    type="url"
                    onChange={() => setVideoError("")}
                    placeholder="https://x.com/..."
                    {...stylex.props(styles.input)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleAddVideo();
                      }
                    }}
                  />
                  {videoError && <p {...stylex.props(styles.fieldError)}>{videoError}</p>}
                  <button
                    type="button"
                    onClick={handleAddVideo}
                    disabled={isSubmitting}
                    {...stylex.props(
                      styles.linkButton,
                      styles.linkButtonSpaced,
                      styles.disabledable,
                    )}
                  >
                    + Add
                  </button>
                </Field.Root>
              </>
            )}

            {/* Shared fields */}
            <Field.Root name="location" {...stylex.props(styles.stack4)}>
              <Field.Label {...stylex.props(styles.label)}>Location (optional)</Field.Label>
              <Field.Control
                type="text"
                defaultValue={mode === "edit" ? (props.incident.location ?? "") : ""}
                placeholder="Minneapolis, MN"
                {...stylex.props(styles.input)}
              />
            </Field.Root>

            <Field.Root name="incidentDate" {...stylex.props(styles.stack4)}>
              <Field.Label {...stylex.props(styles.label)}>Date (optional)</Field.Label>
              <Field.Control
                type="date"
                defaultValue={
                  mode === "edit" && props.incident.incidentDate
                    ? new Date(props.incident.incidentDate).toISOString().split("T")[0]
                    : ""
                }
                {...stylex.props(styles.input)}
              />
            </Field.Root>

            <Field.Root name="description" {...stylex.props(styles.stack4)}>
              <Field.Label {...stylex.props(styles.label)}>Description (optional)</Field.Label>
              <Field.Control
                render={<textarea rows={2} />}
                defaultValue={mode === "edit" ? (props.incident.description ?? "") : ""}
                placeholder="Brief description of what happened..."
                {...stylex.props(styles.textarea)}
              />
            </Field.Root>

            <div {...stylex.props(styles.actions)}>
              <button type="submit" disabled={isSubmitting} {...stylex.props(styles.submit)}>
                {isSubmitting ? submittingText : submitText}
              </button>
              <Dialog.Close {...stylex.props(styles.linkButton)}>Cancel</Dialog.Close>
            </div>
          </Form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
