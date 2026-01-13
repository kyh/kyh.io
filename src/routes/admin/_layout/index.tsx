import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/_layout/')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/incidents' })
  },
})
