import { createHash } from "node:crypto";

export const posterOf = (headers: Headers, now = new Date()) => {
  const ip =
    headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  return createHash("sha256")
    .update(`${ip}:${now.toISOString().slice(0, 10)}`)
    .digest("hex");
};
