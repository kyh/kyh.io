// Guards for values that crossed the multiplayer wire. Everything off it is a
// JsonValue of unknown shape; these narrow it or say no, never throw.
import type { JsonValue } from "@vibedgames/multiplayer";

/** An object (not an array), or null. */
export const asRecord = (value: JsonValue | undefined) =>
  value instanceof Object && !Array.isArray(value) ? value : null;

/** A string, or "". */
export const asText = (value: JsonValue | undefined) => (String(value) === value ? value : "");

/** A finite number, or null. */
export const asFinite = (value: JsonValue | undefined) =>
  Number.isFinite(value) ? Number(value) : null;
