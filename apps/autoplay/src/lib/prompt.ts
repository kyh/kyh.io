// Turns a post into a text-to-video prompt. The default model runs its own
// prompt expansion, so this stays light: strip feed noise (links, leading
// mention chains) and frame the rest as a broadcast scene.

const URL_PATTERN = /https?:\/\/\S+/g;
const LEADING_MENTIONS = /^(\s*@\w+[,\s]*)+/;

export const buildVideoPrompt = (text: string, authorName: string): string => {
  const cleaned = text
    .replace(URL_PATTERN, "")
    .replace(LEADING_MENTIONS, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned === "") {
    return `An abstract, dreamlike television broadcast inspired by a post from ${authorName}: drifting light, soft gradients, late-night channel-surfing energy.`;
  }

  return `A short cinematic widescreen video that visualizes this social media post like a TV segment, capturing its mood and subject literally where possible: "${cleaned}"`;
};
