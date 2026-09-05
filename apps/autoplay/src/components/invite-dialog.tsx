"use client";

import { useState } from "react";

import { errorPayloadSchema } from "@/lib/api-contract";
import { WindowDialog } from "@/components/window-dialog";

// The door. A new viewer gives the invite code once; the station answers with
// a cookie, and the X sign-in that follows is allowed to create their account.

type InviteDialogProps = {
  onInvited: () => void;
  onClose: () => void;
};

export const InviteDialog = (props: InviteDialogProps) => {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        const parsed = errorPayloadSchema.safeParse(await response.json().catch(() => null));
        setError(parsed.success ? parsed.data.error : "Couldn't check the code");
        return;
      }
      props.onInvited();
    } finally {
      setBusy(false);
    }
  };

  return (
    <WindowDialog open onClose={props.onClose} title="Invite only">
      <form
        className="m-3 space-y-2 text-[11px]"
        onSubmit={(event) => {
          event.preventDefault();
          if (code.trim() !== "") void submit();
        }}
      >
        <p className="leading-relaxed">
          The station is invite only. Enter the code and sign in with X; already signed up? Just
          sign in.
        </p>
        <div className="flex gap-1">
          <input
            type="text"
            autoFocus
            autoComplete="off"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="invite code"
            aria-label="Invite code"
            className="bevel-in min-w-0 flex-1 bg-white px-2 py-1 text-[11px] outline-none"
          />
          <button
            type="submit"
            disabled={busy || code.trim() === ""}
            className="y2k-btn cursor-pointer px-3 py-1 text-[10px] tracking-widest uppercase disabled:cursor-default"
          >
            enter
          </button>
        </div>
        {error !== undefined && <p className="text-[10px] text-red-700">{error}</p>}
        <button
          type="button"
          onClick={props.onInvited}
          className="text-[10px] tracking-widest uppercase underline decoration-dotted"
        >
          I already have an account — sign in
        </button>
      </form>
    </WindowDialog>
  );
};
