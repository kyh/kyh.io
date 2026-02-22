import Link from "next/link";

import { HelpDialog } from "./help-dialog";

export const Header = () => {
  return (
    <header className="flex items-center justify-between py-4">
      <Link href="/" className="text-xl font-bold tracking-tight">
        Stonksville
      </Link>
      <div className="flex items-center gap-1">
        <HelpDialog />
      </div>
    </header>
  );
};
