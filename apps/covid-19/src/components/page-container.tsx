import type { ReactNode } from "react";

export const PageContainer = ({ children }: { children: ReactNode }) => (
  <main className="mx-auto w-full max-w-7xl justify-between sm:flex sm:px-6 lg:px-8">
    {children}
  </main>
);
