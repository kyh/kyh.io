import { pickGmailCandidate } from "./gmail";
import { pickRssCandidate } from "./rss";
import type { Item, SourceAccess, SourceContext } from "./types";
import { pickXCandidate } from "./x";
import { pickYoutubeCandidate } from "./youtube";

/** The item that should air next on a source, or undefined when nothing new qualifies. */
export const pickCandidate = (
  access: SourceAccess,
  sourceId: string,
  context: SourceContext,
): Promise<Item | undefined> => {
  switch (access.kind) {
    case "x":
      return pickXCandidate(access, sourceId, context);
    case "gmail":
      return pickGmailCandidate(access, sourceId, context);
    case "rss":
      return pickRssCandidate(access, sourceId, context);
    case "youtube":
      return pickYoutubeCandidate(access, sourceId, context);
  }
};
