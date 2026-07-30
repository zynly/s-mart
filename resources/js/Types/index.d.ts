export type AuthUser = {
  id: number
  name: string
  username: string
  email: string
  avatar: string | null
  roles: string[]
  permissions: string[]
}

export type Paginated<T> = {
  data: T[]
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
  auth: {
    user: AuthUser | null
  }
  flash: {
    success: string | null
    error: string | null
    warning: string | null
    info: string | null
  }
  appName: string
  status?: string
}
