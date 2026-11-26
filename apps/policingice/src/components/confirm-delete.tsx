"use client";

import { useState } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";

/** Asks before an incident is deleted: `ask(id)` opens the dialog, and `remove` runs on Delete. */
export const useConfirmDelete = (remove: (id: number) => Promise<void>) => {
  const [pending, setPending] = useState<number>();

  const dialog = (
    <AlertDialog.Root
      open={pending !== undefined}
      onOpenChange={(open) => {
        if (!open) {
          setPending(undefined);
        }
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 w-full max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 text-sm">
          <AlertDialog.Title className="mb-4 font-medium">Delete this incident?</AlertDialog.Title>
          <div className="flex justify-end gap-2">
            <AlertDialog.Close className="cursor-pointer rounded px-3 py-1.5 hover:bg-muted">
              Cancel
            </AlertDialog.Close>
            <button
              type="button"
              className="cursor-pointer rounded px-3 py-1.5 text-destructive hover:bg-muted"
              onClick={() => {
                setPending(undefined);

                if (pending !== undefined) {
                  void remove(pending);
                }
              }}
            >
              Delete
            </button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );

  return { ask: setPending, dialog };
};
