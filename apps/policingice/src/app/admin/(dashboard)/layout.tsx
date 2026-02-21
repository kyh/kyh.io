import { redirect } from "next/navigation";
import Link from "next/link";

import { getAdminUser } from "@/lib/admin-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUser();
  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-white px-4 py-8 sm:px-6">
      <div className="max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-base font-normal">Admin</h1>
          <nav className="flex gap-4 text-sm">
            <Link
              href="/admin/incidents"
              className="text-neutral-500 hover:text-neutral-900"
            >
              Incidents
            </Link>
            <Link
              href="/admin/create"
              className="text-neutral-500 hover:text-neutral-900"
            >
              Create
            </Link>
            <Link
              href="/admin/reddit-feed"
              className="text-neutral-500 hover:text-neutral-900"
            >
              Reddit
            </Link>
            <Link href="/" className="text-neutral-400 hover:text-neutral-900">
              Exit
            </Link>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
