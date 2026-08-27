"use client";

import { feature } from "@repo/tailwind-compat/media.stylex";
import { leading } from "@repo/tailwind-compat/leading.stylex";
import { theme } from "../../../styles/tokens.stylex";

import {
  colors,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";

import * as stylex from "@stylexjs/stylex";

import { useRef, useState } from "react";
import { Field } from "@base-ui/react/field";
import { Form } from "@base-ui/react/form";
import { useRouter } from "next/navigation";

import { toast } from "@/components/toast";
import { formString } from "@/lib/form-utils";
import { isValidVideoUrl } from "@/lib/video-utils";
import { bulkCreateIncidents } from "@/lib/admin-action";

const styles = stylex.create({
  heading: {
    marginBottom: spacing[4],
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    fontWeight: fontWeights.medium,
  },
  stacked: { marginBottom: { default: spacing[4], ":last-child": 0 } },
  label: {
    marginBottom: spacing[1],
    display: "block",
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    color: theme.mutedForeground,
  },
  textarea: {
    width: "100%",
    borderRadius: radii.default,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: theme.border, ":focus": theme.mutedForeground },
    backgroundColor: "transparent",
    padding: spacing[2],
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    outline: "none",
  },
  counts: { fontSize: fontSizes.sm, lineHeight: leading.sm },
  valid: { color: colors.green600 },
  invalid: { marginLeft: spacing[2], color: theme.destructive },
  row: { display: "flex", gap: spacing[4] },
  radioLabel: {
    display: "flex",
    cursor: "pointer",
    alignItems: "center",
    gap: spacing[2],
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
  },
  grow: { flex: 1 },
  input: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderColor: { default: theme.input, ":focus": theme.foreground },
    backgroundColor: "transparent",
    paddingBlock: spacing[2],
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    outline: "none",
  },
  inputAuto: {
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderColor: { default: theme.input, ":focus": theme.foreground },
    backgroundColor: "transparent",
    paddingBlock: spacing[2],
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    outline: "none",
  },
  submit: {
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    color: {
      default: theme.mutedForeground,
      [feature.hover]: { default: theme.mutedForeground, ":hover": theme.foreground },
    },
    opacity: { default: null, ":disabled": 0.5 },
  },
});

const AdminCreate = () => {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [urlsText, setUrlsText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groupAsOne, setGroupAsOne] = useState(false);

  const urls = urlsText
    .split("\n")
    .map((u) => u.trim())
    .filter(Boolean);
  const validUrls = urls.filter((u) => isValidVideoUrl(u));
  const invalidUrls = urls.filter((u) => !isValidVideoUrl(u));
  const incidentCount = groupAsOne ? 1 : validUrls.length;

  return (
    <div>
      <h2 {...stylex.props(styles.heading)}>Bulk Create Incidents</h2>

      <Form
        ref={formRef}
        onSubmit={async (e) => {
          e.preventDefault();
          if (validUrls.length === 0) return;

          const formData = new FormData(e.currentTarget);
          const location = formString(formData, "location").trim();
          const description = formString(formData, "description").trim();
          const incidentDate = formString(formData, "incidentDate");

          setIsSubmitting(true);

          try {
            const res = await bulkCreateIncidents({
              urls: validUrls,
              groupAsOne,
              location: location || undefined,
              description: description || undefined,
              incidentDate: incidentDate || undefined,
            });
            if (res.created > 0) {
              toast.success(`Created ${res.created} incident(s)`);
              setUrlsText("");
              formRef.current?.reset();
              router.refresh();
            }
            if (res.skipped > 0) {
              toast(`Skipped ${res.skipped} existing URL(s)`);
            }
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <Field.Root name="urls" {...stylex.props(styles.stacked)}>
          <Field.Label {...stylex.props(styles.label)}>Video URLs (one per line)</Field.Label>
          <Field.Control
            render={
              <textarea rows={8} value={urlsText} onChange={(e) => setUrlsText(e.target.value)} />
            }
            {...stylex.props(styles.textarea)}
            placeholder="https://x.com/user/status/123&#10;https://youtube.com/watch?v=abc&#10;https://tiktok.com/@user/video/456"
          />
        </Field.Root>

        {urls.length > 0 && (
          <div {...stylex.props(styles.counts, styles.stacked)}>
            <span {...stylex.props(styles.valid)}>{validUrls.length} valid</span>
            {invalidUrls.length > 0 && (
              <span {...stylex.props(styles.invalid)}>{invalidUrls.length} invalid</span>
            )}
          </div>
        )}

        <div {...stylex.props(styles.row, styles.stacked)}>
          <label {...stylex.props(styles.radioLabel)}>
            <input
              type="radio"
              name="grouping"
              checked={!groupAsOne}
              onChange={() => setGroupAsOne(false)}
            />
            1 incident per URL
          </label>
          <label {...stylex.props(styles.radioLabel)}>
            <input
              type="radio"
              name="grouping"
              checked={groupAsOne}
              onChange={() => setGroupAsOne(true)}
            />
            Group as 1 incident
          </label>
        </div>

        <div {...stylex.props(styles.row, styles.stacked)}>
          <Field.Root name="location" {...stylex.props(styles.grow)}>
            <Field.Control
              type="text"
              placeholder="Location (optional)"
              {...stylex.props(styles.input)}
            />
          </Field.Root>
          <Field.Root name="incidentDate">
            <Field.Control type="date" {...stylex.props(styles.inputAuto)} />
          </Field.Root>
        </div>

        <Field.Root name="description" {...stylex.props(styles.stacked)}>
          <Field.Control
            type="text"
            placeholder="Description (optional)"
            {...stylex.props(styles.input)}
          />
        </Field.Root>

        <button
          type="submit"
          disabled={isSubmitting || validUrls.length === 0}
          {...stylex.props(styles.submit)}
        >
          {isSubmitting
            ? "Creating..."
            : `Create ${incidentCount} incident${incidentCount !== 1 ? "s" : ""}`}
        </button>
      </Form>
    </div>
  );
};

export default AdminCreate;
