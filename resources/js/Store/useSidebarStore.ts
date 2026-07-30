import { create } from 'zustand'

type SidebarState = {
  collapsed: boolean
  openGroups: string[]
  toggle: () => void
  setCollapsed: (collapsed: boolean) => void
  toggleGroup: (group: string) => void
}

const STORAGE_KEY = 'sidebar-state'

function loadPersisted(): { collapsed: boolean; openGroups: string[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    return raw ? JSON.parse(raw) : { collapsed: false, openGroups: [] }
  } catch {
    return { collapsed: false, openGroups: [] }
  }
}

function persist(state: { collapsed: boolean; openGroups: string[] }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  ...loadPersisted(),
  toggle: () => {
    const collapsed = !get().collapsed
    persist({ collapsed, openGroups: get().openGroups })
    set({ collapsed })
  },
  setCollapsed: (collapsed) => {
    persist({ collapsed, openGroups: get().openGroups })
    set({ collapsed })
  },
  toggleGroup: (group) => {
    const openGroups = get().openGroups.includes(group)
      ? get().openGroups.filter((g) => g !== group)
      : [...get().openGroups, group]
    persist({ collapsed: get().collapsed, openGroups })
    set({ openGroups })
  },
}))
