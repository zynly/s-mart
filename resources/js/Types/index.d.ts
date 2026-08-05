export type AuthUser = {
  id: number
  name: string
  username: string
  email: string
  avatar: string | null
  roles: string[]
  permissions: string[]
}

export type AuthGuardian = {
  id: number
  name: string
  phone: string
}

export type Paginated<T> = {
  data: T[]
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export type NavigationItem = {
  key: string
  label: string
  href: string
  icon: string
  highlight: boolean
  active: boolean
  badge: string | null
}

export type NavigationGroup = {
  group: string
  items: NavigationItem[]
}

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
  auth: {
    user: AuthUser | null
  }
  guardianAuth: {
    guardian: AuthGuardian | null
  }
  flash: {
    success: string | null
    error: string | null
    warning: string | null
    info: string | null
  }
  navigation: NavigationGroup[]
  unreadNotificationsCount: number
  guardianUnreadNotificationsCount: number
  appName: string
  status?: string
  // REVISI-R1-v2.md §1.5 — null untuk owner (bypass semua outlet, tidak
  // punya satu outlet primary tunggal).
  activeOutlet: { id: number; name: string } | null
}
