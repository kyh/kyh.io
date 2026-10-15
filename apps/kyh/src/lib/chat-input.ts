// Typing from anywhere on a page, without a text box: one window listener,
// ahead of every other (capture), that keeps each key for itself while a
// draft is open so nothing underneath pans, plays or scrolls.
import { editDraft } from "@/lib/chat";
import { discoverEgg } from "@/easter-eggs/store";

interface ChatInputOptions {
  /** Whether a key does something else on this page, so it doesn't start a draft. */
  claims?: (key: string) => boolean;
  onDraft: (draft: string | null) => void;
  onSend: (text: string) => void;
}

const isField = (target: EventTarget | null) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement ||
  (target instanceof HTMLElement && target.isContentEditable);

/** Listen for typing; returns the way to stop. */
export const listenForChat = ({ claims, onDraft, onSend }: ChatInputOptions) => {
  let draft: string | null = null;
  const close = () => {
    if (draft !== null) {
      draft = null;
      onDraft(null);
    }
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.isComposing || isField(event.target)) {
      return;
    }
    const edit = editDraft(draft, event, claims);
    if (!edit) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (edit.kind === "draft") {
      ({ draft } = edit);
      onDraft(draft);
      return;
    }
    close();
    if (edit.kind === "send") {
      onSend(edit.text);
      discoverEgg("chat");
    }
  };
  window.addEventListener("keydown", onKeyDown, { capture: true });
  window.addEventListener("blur", close);
  return () => {
    window.removeEventListener("keydown", onKeyDown, { capture: true });
    window.removeEventListener("blur", close);
    close();
  };
};
