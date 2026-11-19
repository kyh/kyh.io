const URL_PATTERN = /https?:\/\/\S+/gu;

const ENTITIES = new Map([
  ["&amp;", "&"],
  ["&lt;", "<"],
  ["&gt;", ">"],
  ["&quot;", '"'],
  ["&#39;", "'"],
]);

export const displayPostText = (text: string) =>
  text
    .replaceAll(URL_PATTERN, "")
    .replaceAll(/&(?:amp|lt|gt|quot|#39);/gu, (entity) => ENTITIES.get(entity) ?? entity)
    .replaceAll(/\s+/gu, " ")
    .trim();
