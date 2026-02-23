import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";

import { getSession } from "@/lib/auth";

const AdminContent = async ({ children }: { children: React.ReactNode }) => {
  const session = await getSession();
  if (!session?.user || session.user.isAnonymous) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-base font-normal">Admin</h1>
          <nav className="flex gap-4 text-sm">
            <Link
              href="/admin/incidents"
              className="text-muted-foreground hover:text-foreground"
            >
              Incidents
            </Link>
            <Link
              href="/admin/create"
              className="text-muted-foreground hover:text-foreground"
            >
              Create
            </Link>
            <Link
              href="/admin/reddit-feed"
              className="text-muted-foreground hover:text-foreground"
            >
              Reddit
            </Link>
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground"
            >
              Exit
            </Link>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
};

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      }
    >
      <AdminContent>{children}</AdminContent>
    </Suspense>
  );
};

export default AdminLayout;
