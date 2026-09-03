"use client";

import { Dialog } from "@base-ui/react/dialog";

// A desktop window as a modal: Base UI handles focus, escape, the backdrop and
// scroll locking; the chrome is the same `win` plastic as everything else.

type WindowDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Title-bar gradient variant, matching the window's role. */
  tone?: "alt" | "cyan";
  children: React.ReactNode;
};

export const WindowDialog = (props: WindowDialogProps) => (
  <Dialog.Root
    open={props.open}
    onOpenChange={(open) => {
      if (!open) props.onClose();
    }}
  >
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-10 bg-outline/50" />
      <Dialog.Popup className="win fixed top-1/2 left-1/2 z-20 flex max-h-[85dvh] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col font-mono outline-none">
        <div
          className={`win-title flex shrink-0 items-center justify-between px-3 py-1.5 ${
            props.tone === "cyan" ? "win-title-cyan" : "win-title-alt"
          }`}
        >
          <Dialog.Title className="text-xs font-bold tracking-[0.2em] uppercase">
            {props.title}
          </Dialog.Title>
          <Dialog.Close
            aria-label="Close"
            className="grid size-4 cursor-pointer place-items-center border-2 border-outline bg-chrome text-[10px] text-outline"
          >
            ✕
          </Dialog.Close>
        </div>
        {props.children}
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>
);
