// Turns a post into a text-to-video prompt.
//
// A post is not a shot list: it carries links, handles, hashtags and opinions,
// and handing one over raw produces the incoherence you would expect — the
// model tries to render an argument. So the noise is stripped and what remains
// is framed as a single continuous scene, which is the only thing a few
// seconds of video can actually be. Asking for no on-screen text matters too:
// left alone these models letter the frame with garbled captions.

const URL_PATTERN = /https?:\/\/\S+/g;
const MENTION_PATTERN = /@\w+/g;
const HASHTAG_PATTERN = /#(\w+)/g;
/** Long posts blur the subject; a video only ever depicts the opening idea. */
const MAX_SUBJECT_LENGTH = 300;

const SHOT = "A single continuous cinematic shot, filmed like a television news segment";
const STYLE =
  "Natural light, shallow depth of field, steady camera with slow deliberate movement. " +
  "Photographic and grounded, not illustrated. No on-screen text, captions, subtitles, " +
  "watermarks or user interface.";

const clean = (text: string): string =>
  text
    .replace(URL_PATTERN, "")
    .replace(MENTION_PATTERN, "")
    // A hashtag's word is usually the subject — keep it, drop the hash.
    .replace(HASHTAG_PATTERN, "$1")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (text: string): string => {
  if (text.length <= MAX_SUBJECT_LENGTH) return text;
  const clipped = text.slice(0, MAX_SUBJECT_LENGTH);
  const lastStop = Math.max(clipped.lastIndexOf(". "), clipped.lastIndexOf(", "));
  return lastStop > MAX_SUBJECT_LENGTH / 2 ? clipped.slice(0, lastStop) : clipped;
};

export const buildVideoPrompt = (text: string, authorName: string): string => {
  const subject = truncate(clean(text));

  if (subject === "") {
    return `${SHOT}: an abstract late-night broadcast interlude inspired by ${authorName} — drifting light over soft gradients, dust in the air, the feeling of channel-surfing after midnight. ${STYLE}`;
  }

  return `${SHOT}, depicting this scene literally wherever it can be pictured, and evoking its mood where it cannot: "${subject}". ${STYLE}`;
};
