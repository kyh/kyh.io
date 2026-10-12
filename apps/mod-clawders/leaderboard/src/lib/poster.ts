import { createHash } from "node:crypto";

// Who is posting, as far as the rate limit needs to know: the client's IP
// hashed with the day, so the stored value can't be joined across days and
// the IP itself is never kept.
export const posterOf = (headers: Headers, now = new Date()) => {
  const ip =
    headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256")
    .update(`${ip}:${now.toISOString().slice(0, 10)}`)
    .digest("hex");
};
