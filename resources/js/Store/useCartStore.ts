import { create } from 'zustand'

// Skeleton saja di Fase 0 — diisi di Fase 8 (layar kasir).
export type CartItem = {
  productId: number
  name: string
  price: number
  qty: number
}

type CartState = {
  items: CartItem[]
  memberId: number | null
  idempotencyKey: string | null
  addItem: (item: CartItem) => void
  updateQty: (productId: number, qty: number) => void
  removeItem: (productId: number) => void
  clearCart: () => void
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  memberId: null,
  idempotencyKey: null,
  addItem: (item) =>
    set((state) => ({
      items: [...state.items, item],
    })),
  updateQty: (productId, qty) =>
    set((state) => ({
      items: state.items.map((item) => (item.productId === productId ? { ...item, qty } : item)),
    })),
  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((item) => item.productId !== productId),
    })),
  clearCart: () => set({ items: [], memberId: null, idempotencyKey: null }),
}))
