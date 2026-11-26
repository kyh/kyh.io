import type { JsonValue } from "@vibedgames/multiplayer";

/** An object (not an array), or null. */
export const asRecord = (value: JsonValue | undefined) =>
  value instanceof Object && !Array.isArray(value) ? value : null;

/** Whether a wire value is a string. */
export const isText = (value: JsonValue | undefined): value is string =>
  value?.constructor === String;

/** A string, or "". */
export const asText = (value: JsonValue | undefined) => (isText(value) ? value : "");

/** A finite number, or null. */
export const asFinite = (value: JsonValue | undefined) =>
  Number.isFinite(value) ? Number(value) : null;
