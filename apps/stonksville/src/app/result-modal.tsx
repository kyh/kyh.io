"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import { Drawer as DrawerPrimitive } from "vaul";

import { useMediaQuery } from "@/components/utils";
import { useToast } from "@/components/toast";

import type { GameState } from "@/lib/puzzle-query";
import { buildShareText, copyShareText } from "@/lib/share";

import { Countdown } from "./countdown";

type ResultModalProps = {
  state: GameState;
  puzzleNumber: number;
};

function ResultContent({ state, puzzleNumber }: ResultModalProps) {
  const won = state.status === "won";
  const toast = useToast();

  async function handleShare() {
    const text = buildShareText(puzzleNumber, state.guesses, won);
    const ok = await copyShareText(text);
    if (ok) {
      toast.show("Copied to clipboard!");
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="text-center">
        <p className="text-lg font-semibold">
          {won ? "You got it!" : "Better luck tomorrow"}
        </p>
        <p className="text-muted-foreground text-sm">
          {won
            ? `Solved in ${state.guesses.length}/6 guesses`
            : "The answer will be revealed tomorrow"}
        </p>
      </div>

      <button
        onClick={handleShare}
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium shadow-xs"
      >
        <Share2 className="size-4" />
        Share Result
      </button>

      <Countdown />
    </div>
  );
}

export function ResultModal(props: ResultModalProps) {
  const [open, setOpen] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 640px)");

  if (isDesktop) {
    return (
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Popup className="bg-background fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border p-6 shadow-lg sm:max-w-lg">
            <div className="flex flex-col gap-2 text-center sm:text-left">
              <Dialog.Title className="text-lg font-semibold leading-none">
                Stonksville #{props.puzzleNumber}
              </Dialog.Title>
            </div>
            <ResultContent {...props} />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <DrawerPrimitive.Root open={open} onOpenChange={setOpen}>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <DrawerPrimitive.Content className="bg-background fixed inset-x-0 bottom-0 z-50 mt-24 flex max-h-[80vh] flex-col rounded-t-lg border-t">
          <div className="bg-muted mx-auto mt-4 h-2 w-[100px] shrink-0 rounded-full" />
          <div className="flex flex-col gap-0.5 p-4 text-center">
            <DrawerPrimitive.Title className="text-foreground font-semibold">
              Stonksville #{props.puzzleNumber}
            </DrawerPrimitive.Title>
          </div>
          <div className="px-4 pb-6">
            <ResultContent {...props} />
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
