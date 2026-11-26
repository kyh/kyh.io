import { pickGmailCandidate } from "./gmail";
import { pickRssCandidate } from "./rss";
import type { SourceAccess, SourceContext } from "./types";
import { pickXCandidate } from "./x";
import { pickYoutubeCandidate } from "./youtube";

/** The item that should air next on a source, or undefined when nothing new qualifies. */
export const pickCandidate = async (
  access: SourceAccess,
  sourceId: string,
  context: SourceContext,
) => {
  switch (access.kind) {
    case "x": {
      return await pickXCandidate(access, sourceId, context);
    }

    case "gmail": {
      return await pickGmailCandidate(access, sourceId, context);
    }

    case "rss": {
      return await pickRssCandidate(access, sourceId, context);
    }

    case "youtube": {
      return await pickYoutubeCandidate(access, sourceId, context);
    }

    default: {
      return access satisfies never;
    }
  }
};
