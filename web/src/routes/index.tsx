import { createFileRoute, Navigate } from '@tanstack/react-router'
import { isAuthenticated } from '@/lib/auth'

export const Route = createFileRoute('/')({
  component: IndexRoute,
})

function IndexRoute() {
  return isAuthenticated() ? <Navigate to="/nodes" /> : <Navigate to="/login" />
}
