export type PublicProduct = {
  slug: string
  name: string
  description: string | null
  category: string | null
  brand: string | null
  price: number
  promoPrice: number | null
  promoLabel: string | null
  stockBadge: 'available' | 'limited' | 'out'
  images: string[]
}

export type PublicPromo = {
  code: string
  name: string
  description: string | null
  type: string
  discount_type: string
  discount_value: number
  start_date: string | null
  end_date: string | null
  products: { id: number; slug: string; name: string }[]
}
