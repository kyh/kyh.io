import { createRouteHandler } from "@fal-ai/server-proxy/nextjs";

import { getSession } from "@/lib/auth";
import { isOwnerHandle } from "@/lib/lineup";
import { programming } from "@/lib/live";

// The browser's way to fal, for the director session: the key stays here, and
// only a signed-in viewer inside the day's budget may open anything — checked
// before negotiation, because a session is billed for a minute the moment it
// exists. The endpoint allowlist stops a viewer running some other model on
// the station's key; the proxy checks it against the app id of every session
// it negotiates, not only the URL.

export const DIRECTOR_MODEL = "minimax/h3-max/director";

export const { GET, POST, PUT } = createRouteHandler({
  allowUnauthorizedRequests: false,
  isAuthenticated: async () => {
    const session = await getSession();
    if (session === null) return false;
    return programming.withinBudget({
      userId: session.user.id,
      owner: isOwnerHandle(session.user.username),
    });
  },
  allowedEndpoints: [DIRECTOR_MODEL, `${DIRECTOR_MODEL}/**`],
});
