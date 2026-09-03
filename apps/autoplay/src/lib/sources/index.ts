import { pickGmailCandidate } from "./gmail";
import { pickRssCandidate } from "./rss";
import type { Item, SourceAccess } from "./types";
import { pickXCandidate } from "./x";
import { pickYoutubeCandidate } from "./youtube";

/** The item that should air next on a source, or undefined when nothing new qualifies. */
export const pickCandidate = (
  access: SourceAccess,
  sourceId: string,
  aired: Set<string>,
): Promise<Item | undefined> => {
  switch (access.kind) {
    case "x":
      return pickXCandidate(access, sourceId, aired);
    case "gmail":
      return pickGmailCandidate(access, sourceId, aired);
    case "rss":
      return pickRssCandidate(access, sourceId, aired);
    case "youtube":
      return pickYoutubeCandidate(access, sourceId, aired);
  }
};
