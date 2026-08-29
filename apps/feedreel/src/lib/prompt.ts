// Turns a post into a text-to-video prompt. The default model runs its own
// prompt expansion, so this stays light: strip feed noise (links, leading
// mention chains) and frame the rest as a scene.

const URL_PATTERN = /https?:\/\/\S+/g;
const LEADING_MENTIONS = /^(\s*@\w+[,\s]*)+/;

export const buildVideoPrompt = (text: string, authorName: string): string => {
  const cleaned = text
    .replace(URL_PATTERN, "")
    .replace(LEADING_MENTIONS, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned === "") {
    return `An abstract, dreamlike vertical video inspired by a post from ${authorName}: drifting light, soft gradients, a feeling of scrolling through a feed late at night.`;
  }

  return `A short cinematic vertical video that visualizes this social media post, capturing its mood and subject literally where possible: "${cleaned}"`;
};
