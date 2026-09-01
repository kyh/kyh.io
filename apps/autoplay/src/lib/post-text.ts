// Post text as it should read on screen. A t.co link carries no meaning to a
// viewer — it is the single ugliest thing in a caption — and X's HTML entities
// arrive raw in the API payload. Mentions and hashtags stay: unlike in a video
// prompt, they are part of how the post reads.

const URL_PATTERN = /https?:\/\/\S+/g;

const ENTITIES = new Map([
  ["&amp;", "&"],
  ["&lt;", "<"],
  ["&gt;", ">"],
  ["&quot;", '"'],
  ["&#39;", "'"],
]);

export const displayPostText = (text: string): string =>
  text
    .replace(URL_PATTERN, "")
    .replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => ENTITIES.get(entity) ?? entity)
    .replace(/\s+/g, " ")
    .trim();
