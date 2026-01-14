import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { getAdminUser } from '@/lib/admin-auth'

export const Route = createFileRoute('/admin/_layout')({
  beforeLoad: async () => {
    const user = await getAdminUser()
    if (!user) {
      throw redirect({ to: '/admin/login' })
    }
    return { user }
  },
  component: AdminLayout,
})

function AdminLayout() {
  return (
    <div className="min-h-screen bg-white px-4 py-8 sm:px-6">
      <div className="max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-base font-normal">Admin</h1>
          <nav className="flex gap-4 text-sm">
            <Link
              to="/admin/incidents"
              className="text-neutral-500 hover:text-neutral-900 [&.active]:text-neutral-900"
            >
              Incidents
            </Link>
            <Link
              to="/admin/create"
              className="text-neutral-500 hover:text-neutral-900 [&.active]:text-neutral-900"
            >
              Create
            </Link>
            <Link to="/" className="text-neutral-400 hover:text-neutral-900">
              Exit
            </Link>
          </nav>
        </header>
        <Outlet />
      </div>
    </div>
  )
}
