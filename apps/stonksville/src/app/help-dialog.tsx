"use client";

import { Dialog } from "@base-ui/react/dialog";
import { HelpCircle, ArrowUp, ArrowDown, Check } from "lucide-react";

export function HelpDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="hover:bg-accent hover:text-accent-foreground inline-flex size-9 cursor-pointer items-center justify-center rounded-md">
        <HelpCircle className="size-5" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Popup className="bg-background fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border p-6 shadow-lg sm:max-w-lg">
          <div className="flex flex-col gap-2 text-center sm:text-left">
            <Dialog.Title className="text-lg font-semibold leading-none">
              How to Play
            </Dialog.Title>
          </div>
          <div className="space-y-4 text-sm">
            <p>
              Guess the public company from its{" "}
              <strong>revenue breakdown</strong>. You have{" "}
              <strong>6 guesses</strong>.
            </p>

            <div className="space-y-2">
              <p className="font-medium">After each guess, you get clues:</p>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex shrink-0 items-center rounded-md border border-green-500/30 bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-500">
                    Sector
                  </span>
                  <span className="text-muted-foreground">
                    Green = same sector
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <ArrowUp className="size-4 text-yellow-500" />
                  <span className="text-muted-foreground">
                    Answer is higher (market cap, employees, or IPO year)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <ArrowDown className="size-4 text-yellow-500" />
                  <span className="text-muted-foreground">
                    Answer is lower
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Check className="size-4 text-green-500" />
                  <span className="text-muted-foreground">Exact match</span>
                </div>
              </div>
            </div>

            <p className="text-muted-foreground">
              A new puzzle is available every day at midnight UTC.
            </p>
          </div>
          <Dialog.Close className="absolute top-4 right-4 cursor-pointer rounded-sm opacity-70 hover:opacity-100">
            <span className="sr-only">Close</span>
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              />
            </svg>
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
