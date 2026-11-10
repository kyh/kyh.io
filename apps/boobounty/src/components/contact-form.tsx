"use client";

import { useEffect, useRef, useState } from "react";

// No backend yet: the form only acknowledges.
const ContactForm = () => {
  const [sent, setSent] = useState(false);
  const confirmation = useRef<HTMLOutputElement>(null);

  // The form unmounts under the focused button; hand focus to what replaced it.
  useEffect(() => {
    if (sent) {
      confirmation.current?.focus();
    }
  }, [sent]);

  return (
    <div className="mx-auto flex min-h-12 w-full max-w-md items-center justify-center">
      {sent ? null : (
        <form action={() => setSent(true)} className="flex w-full gap-2">
          <label className="sr-only" htmlFor="email">
            Work email
          </label>
          <input
            autoComplete="email"
            className="h-12 min-w-0 flex-1 rounded-full border border-line bg-white px-5 text-[17px] text-foreground transition-[border-color,box-shadow] duration-150 placeholder:text-secondary focus:border-[#0071e3] focus:shadow-[0_0_0_4px_rgb(0_113_227/0.18)] focus:outline-none"
            id="email"
            name="email"
            placeholder="Work email"
            required
            spellCheck={false}
            type="email"
          />
          <button
            className="h-12 shrink-0 rounded-full bg-foreground px-6 text-[17px] font-medium text-white transition-[transform,background-color] duration-200 ease-out hover:bg-honey active:scale-[0.97]"
            type="submit"
          >
            Get tested
          </button>
        </form>
      )}
      <output
        aria-live="polite"
        className="text-[17px] leading-snug text-balance text-secondary outline-none"
        ref={confirmation}
        tabIndex={-1}
      >
        {sent ? "Received. One of our operatives will be in touch. You won’t know which one." : ""}
      </output>
    </div>
  );
};

export { ContactForm };
