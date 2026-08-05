import { useCallback, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { router, usePage } from '@inertiajs/react'
import { useHotkeys } from 'react-hotkeys-hook'
import {
  ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, CreditCard, Pause, Phone,
  ScanLine, Search, ShoppingCart, Trash2, UserCircle, Wallet, X,
} from 'lucide-react'
import PosLayout from '@/Layouts/PosLayout'
import { Money } from '@/Components/common/Money'
import { MoneyInput } from '@/Components/common/MoneyInput'
import { PinInput } from '@/Components/common/PinInput'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Badge } from '@/Components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { newIdempotencyKey } from '@/Lib/idempotency'
import { formatTime } from '@/Lib/date'
import { formatMoney } from '@/Lib/money'
import type { PageProps } from '@/Types'

type PaymentMethodRow = {
  id: number
  code: string
  name: string
  type: string
  allows_change: boolean
  requires_reference: boolean
  mdr_percent: number
}
type CatalogProduct = {
  id: number
  name: string
  sku: string | null
  category: string | null
  unit: { id: number; code: string } | null
  is_favorite: boolean
  price: number
  has_promo: boolean
  image_url: string | null
}
type CatalogPage = { data: CatalogProduct[]; current_page: number; last_page: number; total: number }
type CategoryRef = { id: number; name: string }
type HoldRow = { id: number; reference: string; item_count: number; total: number; held_at: string; member_id: number | null }
type SessionInfo = { id: number; reference: string; opened_at: string; cash_account_id: number } | null
type OutletInfo = { id: number; name: string } | null

type MemberResult = {
  id: number
  member_number: string
  name: string
  type: string
  class_name: string | null
  major: string | null
  balance_cache: number
  point_balance: number
  receivable_limit: number
  has_pin: boolean
  level: { name: string; color: string | null } | null
  status: string
}

type CartLine = {
  key: string
  product_id: number
  unit_id: number
  product_name: string
  product_sku: string | null
  image_url: string | null
  unit_code: string
  qty: number
  unit_price: number
}

type PaymentLine = {
  key: string
  payment_method_id: number
  code: string
  name: string
  type: string
  amount: number
  received_amount?: number
  reference_no?: string
  pin?: string
  point_used?: number
}

type PosIndexProps = {
  session: SessionInfo
  outlet: OutletInfo
  paymentMethods: PaymentMethodRow[]
  catalog: CatalogPage
  categories: CategoryRef[]
  holds: HoldRow[]
  noPinThreshold: number
  pointValue: number
}

export default function Index({ session, outlet, paymentMethods, catalog, categories, holds, noPinThreshold, pointValue }: PosIndexProps) {
  const [catalogCategory, setCatalogCategory] = useState('')
  const [catalogSearch, setCatalogSearch] = useState('')

  function reloadCatalog(patch: { category_id?: string; search?: string; page?: number }) {
    router.get(route('pos.index'), {
      category_id: patch.category_id ?? catalogCategory,
      search: patch.search ?? catalogSearch,
      page: patch.page ?? 1,
    }, { preserveState: true, preserveScroll: true, only: ['catalog'] })
  }
  const [cart, setCart] = useState<CartLine[]>([])
  const [member, setMember] = useState<MemberResult | null>(null)
  const [barcode, setBarcode] = useState('')
  const [scanError, setScanError] = useState<string | null>(null)
  const [memberQuery, setMemberQuery] = useState('')
  const [memberResults, setMemberResults] = useState<MemberResult[]>([])
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [holdsOpen, setHoldsOpen] = useState(false)
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([])
  const [selectedMethodId, setSelectedMethodId] = useState('')
  const [creditWarning, setCreditWarning] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [holdError, setHoldError] = useState<string | null>(null)
  const [cashDialog, setCashDialog] = useState<'in' | 'out' | null>(null)
  const [cashAmount, setCashAmount] = useState(0)
  const [cashDescription, setCashDescription] = useState('')
  const [cashError, setCashError] = useState<string | null>(null)
  const [cashSubmitting, setCashSubmitting] = useState(false)
  const idempotencyKeyRef = useRef(newIdempotencyKey())
  const barcodeRef = useRef<HTMLInputElement>(null)
  const memberInputRef = useRef<HTMLInputElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  function scrollCarousel(direction: -1 | 1) {
    carouselRef.current?.scrollBy({ left: direction * 320, behavior: 'smooth' })
  }

  const subtotal = useMemo(() => cart.reduce((sum, line) => sum + line.qty * line.unit_price, 0), [cart])

  function focusScan() {
    barcodeRef.current?.focus()
  }

  function addLine(product: { id: number; name: string; sku?: string | null; image_url?: string | null }, unit: { id: number; code: string }, price: number, qtyMultiplier: number) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product_id === product.id && l.unit_id === unit.id)

      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, qty: l.qty + qtyMultiplier } : l))
      }

      return [...prev, {
        key: `${product.id}-${unit.id}-${Date.now()}`,
        product_id: product.id,
        unit_id: unit.id,
        product_name: product.name,
        product_sku: product.sku ?? null,
        image_url: product.image_url ?? null,
        unit_code: unit.code,
        qty: qtyMultiplier,
        unit_price: price,
      }]
    })
  }

  async function submitScan(code: string) {
    if (!code.trim()) return

    setScanError(null)

    try {
      const url = `${route('pos.scan')}?barcode=${encodeURIComponent(code)}&outlet_id=${outlet?.id ?? ''}${member ? `&member_id=${member.id}` : ''}`
      const res = await fetch(url)
      const data = await res.json()

      if (!res.ok) {
        setScanError(data.message ?? 'Barcode tidak dikenali.')
        return
      }

      addLine(data.product, data.unit, data.price, data.qty_multiplier)
    } catch {
      setScanError('Gagal memeriksa barcode.')
    } finally {
      setBarcode('')
      focusScan()
    }
  }

  function updateQty(key: string, delta: number) {
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, qty: Math.max(0.001, Math.round((l.qty + delta) * 1000) / 1000) } : l)).filter((l) => l.qty > 0))
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((l) => l.key !== key))
  }

  async function searchMember(query: string) {
    setMemberQuery(query)

    if (!query.trim()) {
      setMemberResults([])
      return
    }

    const res = await fetch(`${route('pos.search-member')}?q=${encodeURIComponent(query)}`)
    const data = await res.json()
    setMemberResults(data.members ?? [])
  }

  function pickMember(m: MemberResult) {
    setMember(m)
    setMemberQuery('')
    setMemberResults([])
    focusScan()
  }

  const doHold = useCallback(() => {
    if (cart.length === 0 || !session) return

    setHoldError(null)

    router.post(
      route('pos.holds.store'),
      {
        outlet_id: outlet?.id,
        cashier_session_id: session.id,
        member_id: member?.id ?? null,
        items: cart.map((l) => ({ product_id: l.product_id, unit_id: l.unit_id, qty: l.qty, unit_price: l.unit_price, product_name: l.product_name, unit_code: l.unit_code })),
      },
      {
        preserveScroll: true,
        preserveState: false,
        onSuccess: () => {
          setCart([])
          setMember(null)
        },
        onError: (errors) => setHoldError(Object.values(errors)[0] ?? 'Gagal menahan transaksi.'),
      },
    )
  }, [cart, member, outlet, session])

  function openCashDialog(type: 'in' | 'out') {
    if (!session) return
    setCashAmount(0)
    setCashDescription('')
    setCashError(null)
    setCashDialog(type)
  }

  function submitCash() {
    if (!session || !cashDialog) return
    if (cashAmount <= 0) {
      setCashError('Nominal harus lebih dari 0.')
      return
    }
    if (!cashDescription.trim()) {
      setCashError('Keterangan wajib diisi.')
      return
    }

    setCashSubmitting(true)
    setCashError(null)

    router.post(
      route(cashDialog === 'in' ? 'admin.cash.in' : 'admin.cash.out'),
      {
        cash_account_id: session.cash_account_id,
        amount: cashAmount,
        description: cashDescription,
      },
      {
        preserveScroll: true,
        onSuccess: () => setCashDialog(null),
        onError: (errors) => setCashError(Object.values(errors)[0] ?? 'Gagal menyimpan transaksi kas.'),
        onFinish: () => setCashSubmitting(false),
      },
    )
  }

  function recallHold(hold: HoldRow) {
    fetch(route('pos.holds.recall', hold.id))
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          setHoldError(data.message ?? 'Tidak bisa mengambil hold ini.')
          return null
        }
        return data
      })
      .then((data) => {
        if (!data) return
        const recalledItems = (data.cart?.items ?? []) as { product_id: number; unit_id: number; qty: number; unit_price?: number; product_name?: string; unit_code?: string }[]
        setCart(
          recalledItems.map((it, index) => ({
            key: `recall-${index}-${Date.now()}`,
            product_id: it.product_id,
            unit_id: it.unit_id,
            product_name: it.product_name ?? `Produk #${it.product_id}`,
            product_sku: null,
            image_url: null,
            unit_code: it.unit_code ?? '',
            qty: it.qty,
            unit_price: it.unit_price ?? 0,
          })),
        )
        setHoldsOpen(false)
        router.reload({ only: ['holds'] })
      })
  }

  const paidTotal = useMemo(() => paymentLines.reduce((sum, l) => sum + l.amount, 0), [paymentLines])
  const remaining = Math.max(0, subtotal - paidTotal)
  const change = paymentLines
    .filter((l) => l.type === 'cash')
    .reduce((sum, l) => sum + Math.max(0, (l.received_amount ?? l.amount) - l.amount), 0)

  function openPayment() {
    if (cart.length === 0) return
    setPaymentLines([])
    setSelectedMethodId('')
    setCreditWarning(null)
    setPaymentError(null)
    // Temuan audit keamanan: key HARUS dibuat sekali per keranjang, bukan
    // per klik submit — kalau tidak, retry (klik dobel/network lambat)
    // mengirim key baru tiap kali dan idempotency di backend jadi tidak
    // berarti (nota ganda, stok/saldo terpotong ganda).
    idempotencyKeyRef.current = newIdempotencyKey()
    setPaymentOpen(true)
  }

  function methodEligible(pm: PaymentMethodRow): boolean {
    if (pm.type === 'deposit' || pm.type === 'credit') return member !== null
    if (pm.type === 'point') return member !== null && member.point_balance > 0
    if (pm.type === 'payroll') return member !== null && (member.type === 'fasilitator' || member.type === 'staff')

    return true
  }

  async function addPaymentLine() {
    const pm = paymentMethods.find((p) => String(p.id) === selectedMethodId)
    if (!pm || remaining <= 0) return

    const amount = pm.type === 'point' ? Math.min(remaining, member ? member.point_balance * pointValue : remaining) : remaining

    const line: PaymentLine = {
      key: `${pm.id}-${Date.now()}`,
      payment_method_id: pm.id,
      code: pm.code,
      name: pm.name,
      type: pm.type,
      amount,
      received_amount: pm.allows_change ? amount : undefined,
      point_used: pm.type === 'point' ? Math.floor(amount / pointValue) : undefined,
    }

    setPaymentLines((prev) => [...prev, line])
    setSelectedMethodId('')

    if (pm.type === 'credit' && member) {
      setCreditWarning(null)
      const res = await fetch(`${route('pos.credit-check')}?member_id=${member.id}&amount=${amount}`)
      const data = await res.json()
      if (!data.allowed) {
        setCreditWarning(`Limit piutang terlampaui: aktif ${formatMoney(data.active)} dari limit ${formatMoney(data.limit)}.`)
      }
    }
  }

  function updatePaymentLine(key: string, patch: Partial<PaymentLine>) {
    setPaymentLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function setLineAmount(line: PaymentLine, rawAmount: number) {
    const max = remaining + line.amount
    const amount = Math.max(1, Math.min(rawAmount, max))
    const patch: Partial<PaymentLine> = { amount }

    if (line.type === 'cash' && line.received_amount === line.amount) {
      patch.received_amount = amount
    }
    if (line.type === 'point') {
      patch.point_used = Math.floor(amount / pointValue)
    }

    updatePaymentLine(line.key, patch)
  }

  function removePaymentLine(key: string) {
    setPaymentLines((prev) => prev.filter((l) => l.key !== key))
    setCreditWarning(null)
  }

  function submitPayment() {
    if (!session || !outlet || paymentLines.length === 0 || remaining > 0) return

    setSubmitting(true)
    setPaymentError(null)

    router.post(
      route('pos.sales.store'),
      {
        outlet_id: outlet.id,
        cashier_session_id: session.id,
        member_id: member?.id ?? null,
        items: cart.map((l) => ({ product_id: l.product_id, unit_id: l.unit_id, qty: l.qty, unit_price: l.unit_price, product_name: l.product_name, unit_code: l.unit_code })),
        payments: paymentLines.map((l) => ({
          payment_method_id: l.payment_method_id,
          amount: l.amount,
          received_amount: l.received_amount,
          reference_no: l.reference_no,
          pin: l.pin,
          point_used: l.point_used,
        })),
      },
      {
        headers: { 'X-Idempotency-Key': idempotencyKeyRef.current },
        onSuccess: () => {
          setCart([])
          setMember(null)
          setPaymentOpen(false)
          idempotencyKeyRef.current = newIdempotencyKey()
        },
        onError: (errors) => setPaymentError(Object.values(errors)[0] ?? 'Gagal menyelesaikan transaksi.'),
        onFinish: () => setSubmitting(false),
      },
    )
  }

  useHotkeys('f3', (e) => { e.preventDefault(); focusScan() })
  useHotkeys('f4', (e) => { e.preventDefault(); doHold() })
  useHotkeys('f5', (e) => { e.preventDefault(); setHoldsOpen(true) })
  useHotkeys('f9', (e) => { e.preventDefault(); openPayment() })
  useHotkeys('f11', (e) => { e.preventDefault(); openCashDialog('in') })
  useHotkeys('f12', (e) => { e.preventDefault(); openCashDialog('out') })
  useHotkeys('esc', () => { setPaymentOpen(false); setHoldsOpen(false); setCashDialog(null) })

  if (!session) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-content">
        <p className="text-lg font-medium">Belum ada sesi kasir aktif.</p>
        <Button onClick={() => router.visit(route('admin.cashier-session.index'))}>Buka Sesi Kasir</Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
        {/* Search bar */}
        <div className="relative shrink-0">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
          <input
            ref={barcodeRef}
            autoFocus
            type="text"
            placeholder="Scan barcode atau cari produk… (F3)"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void submitScan(barcode)
              }
            }}
            className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-12 pr-12 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-navy-500"
          />
          <ScanLine className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
        </div>
        {scanError && <p className="-mt-2 text-sm text-danger">{scanError}</p>}

        {/* Produk Cepat */}
        <section className="shrink-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-navy-600">Produk Cepat</h2>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Cari produk di katalog…"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && reloadCatalog({ search: catalogSearch })}
                className="h-8 max-w-[180px] rounded-lg border-gray-200 bg-white text-xs"
              />
              <Select value={catalogCategory || 'all'} onValueChange={(v) => { const val = v === 'all' ? '' : v; setCatalogCategory(val); reloadCatalog({ category_id: val }) }}>
                <SelectTrigger className="h-8 w-36 rounded-lg border-gray-200 bg-white text-xs"><SelectValue placeholder="Semua kategori" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua kategori</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => scrollCarousel(-1)}
              className="absolute -ml-4 left-0 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white shadow hover:bg-gray-50"
              aria-label="Sebelumnya"
            >
              <ChevronLeft className="size-4" />
            </button>

            <div ref={carouselRef} className="scrollbar-none flex gap-3 overflow-x-auto scroll-smooth px-1 pb-1">
              {catalog.data.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => p.unit && addLine({ id: p.id, name: p.name, sku: p.sku, image_url: p.image_url }, p.unit, p.price, 1)}
                  className="group w-[155px] shrink-0 rounded-xl border border-gray-200 bg-white p-3 text-left transition-all hover:border-navy-400 hover:shadow-sm"
                >
                  <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-lg bg-gray-50">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="size-full object-contain p-1" loading="lazy" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-[10px] text-gray-400">Tidak ada gambar</div>
                    )}
                    {p.has_promo && <Badge className="absolute right-1 top-1 bg-danger text-[9px] text-white">PROMO</Badge>}
                  </div>
                  <p className="mb-1 line-clamp-2 text-xs font-medium leading-tight text-gray-800">{p.name}</p>
                  <p className="text-sm font-bold text-navy-600"><Money amount={p.price} size="sm" /></p>
                </button>
              ))}
              {catalog.data.length === 0 && (
                <p className="p-6 text-center text-sm text-gray-400">Tidak ada produk berstok yang cocok di outlet ini.</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => scrollCarousel(1)}
              className="absolute -mr-4 right-0 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white shadow hover:bg-gray-50"
              aria-label="Berikutnya"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {catalog.last_page > 1 && (
            <div className="mt-2 flex items-center justify-center gap-2 text-sm text-gray-600">
              <Button type="button" size="sm" variant="outline" disabled={catalog.current_page <= 1} onClick={() => reloadCatalog({ page: catalog.current_page - 1 })}>◀</Button>
              <span>Hal. {catalog.current_page} / {catalog.last_page}</span>
              <Button type="button" size="sm" variant="outline" disabled={catalog.current_page >= catalog.last_page} onClick={() => reloadCatalog({ page: catalog.current_page + 1 })}>▶</Button>
            </div>
          )}
        </section>

        {/* Keranjang Transaksi */}
        <section className="flex flex-1 flex-col overflow-hidden">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-navy-600">Keranjang Transaksi</h2>

          <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="h-full overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="w-[40%] px-4 py-3 text-left font-medium text-gray-600">Produk</th>
                    <th className="w-[15%] px-3 py-3 text-center font-medium text-gray-600">Qty</th>
                    <th className="w-[15%] px-3 py-3 text-right font-medium text-gray-600">Harga</th>
                    <th className="w-[12%] px-3 py-3 text-right font-medium text-gray-600">Diskon</th>
                    <th className="w-[12%] px-3 py-3 text-right font-medium text-gray-600">Total</th>
                    <th className="w-[6%] px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cart.map((line) => (
                    <tr key={line.key} className="transition-colors hover:bg-blue-50/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {line.image_url ? (
                            <img src={line.image_url} className="size-10 shrink-0 rounded-lg border border-gray-100 bg-gray-50 object-contain" alt={line.product_name} />
                          ) : (
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-gray-50">
                              <ShoppingCart className="size-4 text-gray-300" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{line.product_name}</p>
                            <p className="text-xs text-gray-400">SKU: {line.product_sku ?? '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateQty(line.key, -1)}
                            className="flex size-7 items-center justify-center rounded-md border border-gray-300 text-sm font-bold text-gray-600 hover:bg-gray-100"
                          >
                            −
                          </button>
                          <span className="w-8 text-center font-mono text-sm font-medium">{line.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateQty(line.key, 1)}
                            className="flex size-7 items-center justify-center rounded-md border border-gray-300 text-sm font-bold text-gray-600 hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-gray-700"><Money amount={line.unit_price} size="sm" /></td>
                      {/* Diskon dihitung server (PromoEngine) saat checkout, belum
                          ada perhitungan promo live di keranjang — tampilkan "−"
                          sampai fitur itu dibangun terpisah. */}
                      <td className="px-3 py-3 text-right font-mono text-sm text-gray-500">−</td>
                      <td className="px-3 py-3 text-right font-mono text-sm font-bold text-gray-900"><Money amount={line.qty * line.unit_price} size="sm" /></td>
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          className="mx-auto flex size-8 items-center justify-center rounded-lg border border-red-200 bg-white text-red-500 transition-colors hover:bg-red-50"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {cart.length === 0 && (
                <div className="flex h-32 flex-col items-center justify-center text-gray-400">
                  <ShoppingCart className="mb-2 size-8 opacity-30" />
                  <p className="text-sm">Keranjang kosong</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Panel kanan */}
      <aside className="flex w-[420px] shrink-0 flex-col gap-5 overflow-y-auto border-l border-gray-200 bg-white p-5">
        {/* Pelanggan / Member */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Pelanggan / Member</h3>
            {member && (
              <button type="button" onClick={() => setMember(null)} className="text-gray-400 hover:text-gray-600">
                <X className="size-4" />
              </button>
            )}
          </div>

          {!member ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => memberInputRef.current?.focus()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy-300 py-3 text-sm font-medium text-navy-600 transition-colors hover:border-navy-500 hover:bg-navy-50"
              >
                <ScanLine className="size-5" />
                Scan kartu member
              </button>
              <Input ref={memberInputRef} placeholder="Scan kartu / NIS / cari nama…" value={memberQuery} onChange={(e) => void searchMember(e.target.value)} className="rounded-xl border-gray-200" />
              {memberResults.length > 0 && (
                <div className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-200">
                  {memberResults.map((m) => (
                    <button key={m.id} type="button" onClick={() => pickMember(m)} className="p-2 text-left text-sm hover:bg-gray-50">
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-gray-500">{m.member_number} · <Money amount={m.balance_cache} size="sm" /></p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200">
                <UserCircle className="size-full p-1 text-gray-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{member.name}</p>
                <p className="text-xs text-gray-500">Saldo: <span className="font-mono font-medium text-navy-700"><Money amount={member.balance_cache} size="sm" /></span></p>
                <p className="text-xs text-gray-400">ID Member: {member.member_number}</p>
                {member.level && <Badge className="mt-1 text-xs" variant="outline">{member.level.name}</Badge>}
              </div>
            </div>
          )}
        </section>

        {/* Ringkasan */}
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-500">Ringkasan</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <Money amount={subtotal} size="sm" />
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Diskon</span>
              <span>−</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Pajak</span>
              <span>−</span>
            </div>
            <div className="mt-2 border-t border-gray-200 pt-2">
              <div className="flex items-baseline justify-between">
                <span className="text-base font-bold text-gray-900">TOTAL</span>
                <span className="font-mono text-2xl font-bold text-navy-700"><Money amount={subtotal} size="lg" /></span>
              </div>
            </div>
          </div>
        </section>

        {holdError && <p className="text-sm text-danger">{holdError}</p>}

        {/* Tombol Bayar */}
        <button
          type="button"
          onClick={openPayment}
          disabled={cart.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-success py-4 text-base font-bold text-white transition-colors hover:bg-success/90 disabled:bg-gray-300"
        >
          <Wallet className="size-5" />
          BAYAR <Money amount={subtotal} size="md" className="text-white" />
        </button>

        {/* Cash Masuk / Cash Keluar */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => openCashDialog('in')}
            className="group flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left transition-colors hover:border-green-300 hover:bg-green-50"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-green-100 transition-colors group-hover:bg-green-200">
              <ArrowDownCircle className="size-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-700">Cash Masuk</p>
              <p className="text-xs text-gray-400">Tambah kas laci</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openCashDialog('out')}
            className="group flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left transition-colors hover:border-red-300 hover:bg-red-50"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-100 transition-colors group-hover:bg-red-200">
              <ArrowUpCircle className="size-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-700">Cash Keluar</p>
              <p className="text-xs text-gray-400">Pengeluaran kas kecil</p>
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setHoldsOpen(true)}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Transaksi Ditahan ({holds.length})
        </button>
      </aside>
    </div>

    {/* Footer hotkey bar */}
    <footer className="flex h-16 shrink-0 items-center gap-2 bg-navy-900 px-4">
      {[
        { key: 'F3', label: 'Cari', icon: Search, onClick: focusScan },
        { key: 'F4', label: 'Tahan', icon: Pause, onClick: doHold, disabled: cart.length === 0 },
        { key: 'F5', label: 'Panggil', icon: Phone, onClick: () => setHoldsOpen(true) },
        { key: 'F9', label: 'Bayar', icon: CreditCard, onClick: openPayment, disabled: cart.length === 0, className: 'bg-green-600 border-green-500 hover:bg-green-700' },
        { key: 'F11', label: 'Cash Masuk', icon: ArrowDownCircle, onClick: () => openCashDialog('in'), className: 'bg-green-700 border-green-600 hover:bg-green-800' },
        { key: 'F12', label: 'Cash Keluar', icon: ArrowUpCircle, onClick: () => openCashDialog('out'), className: 'bg-red-700 border-red-600 hover:bg-red-800' },
      ].map((btn) => (
        <button
          key={btn.key}
          type="button"
          onClick={btn.onClick}
          disabled={btn.disabled}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-navy-700 bg-navy-800 px-2 py-2 text-xs font-medium text-white transition-colors hover:bg-navy-700 disabled:opacity-40 ${btn.className ?? ''}`}
        >
          <span className="font-mono text-[10px] font-bold opacity-70">{btn.key}</span>
          <btn.icon className="size-3.5 shrink-0" />
          <span className="hidden sm:inline">{btn.label}</span>
        </button>
      ))}
    </footer>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-1">
            <div className="rounded-md border border-border p-3 text-center">
              <p className="text-xs text-content-muted">Total Tagihan</p>
              <Money amount={subtotal} size="lg" />
            </div>
            {paymentLines.length > 0 && (
              <div className="flex flex-col divide-y divide-border rounded-md border border-border">
                {paymentLines.map((line) => (
                  <div key={line.key} className="flex flex-col gap-2 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{line.name}</span>
                      <Button type="button" size="icon-sm" variant="ghost" onClick={() => removePaymentLine(line.key)}>
                        <X className="size-3.5" />
                      </Button>
                    </div>
                    {line.type !== 'point' && (
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs">Nominal</Label>
                        <MoneyInput value={line.amount} onChange={(v) => setLineAmount(line, v)} />
                      </div>
                    )}
                    {line.type === 'cash' && (
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs">Uang Diterima</Label>
                        <MoneyInput value={line.received_amount ?? 0} onChange={(v) => updatePaymentLine(line.key, { received_amount: v })} />
                        <div className="flex flex-wrap gap-1.5">
                          {[20000, 50000, 100000].map((amt) => (
                            <Button key={amt} type="button" variant="outline" size="sm" onClick={() => updatePaymentLine(line.key, { received_amount: line.amount + amt })}>
                              +{formatMoney(amt)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    {line.type === 'deposit' && member && (
                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs text-content-muted">Saldo anggota: <Money amount={member.balance_cache} size="sm" /></p>
                        {line.amount >= noPinThreshold && (
                          <>
                            <Label className="text-xs">PIN Anggota {!member.has_pin && '(belum dibuat)'}</Label>
                            <PinInput value={line.pin ?? ''} onChange={(v) => updatePaymentLine(line.key, { pin: v })} />
                          </>
                        )}
                      </div>
                    )}
                    {line.type === 'credit' && creditWarning && (
                      <p className="text-xs text-danger">{creditWarning}</p>
                    )}
                    {(line.type === 'card' || line.type === 'qris' || line.type === 'ewallet' || line.type === 'transfer') && (
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs">No. Referensi / Approval</Label>
                        <Input
                          value={line.reference_no ?? ''}
                          onChange={(e) => updatePaymentLine(line.key, { reference_no: e.target.value })}
                          placeholder="Wajib diisi"
                        />
                      </div>
                    )}
                    {line.type === 'point' && member && (
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs">Poin Dipakai (maks {member.point_balance}, {pointValue.toLocaleString('id-ID')}/poin)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={member.point_balance}
                          value={line.point_used ?? 0}
                          onChange={(e) => {
                            const maxPoints = Math.min(member.point_balance, Math.floor((remaining + line.amount) / pointValue))
                            const pointUsed = Math.max(0, Math.min(Number(e.target.value) || 0, maxPoints))
                            updatePaymentLine(line.key, { point_used: pointUsed, amount: pointUsed * pointValue })
                          }}
                        />
                        <p className="text-xs text-content-muted">Setara <Money amount={line.amount} size="sm" /></p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {remaining > 0 && (
              <div className="space-y-1.5">
                <Label>Tambah Metode Bayar</Label>
                <div className="flex gap-2">
                  <Select value={selectedMethodId} onValueChange={setSelectedMethodId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Pilih metode" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((pm) => (
                        <SelectItem key={pm.id} value={String(pm.id)} disabled={!methodEligible(pm)}>
                          {pm.name}{!methodEligible(pm) ? ' (pilih anggota dulu)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={() => void addPaymentLine()} disabled={!selectedMethodId}>Tambah</Button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1 rounded-md bg-bg p-2 text-sm">
              <div className="flex justify-between">
                <span>Total Dibayar</span>
                <Money amount={paidTotal} size="sm" />
              </div>
              <div className="flex justify-between">
                <span>Kurang</span>
                <Money amount={remaining} size="sm" />
              </div>
              {change > 0 && (
                <div className="flex justify-between font-medium">
                  <span>Kembalian</span>
                  <Money amount={change} size="sm" />
                </div>
              )}
            </div>

            {paymentError && <p className="text-sm text-danger">{paymentError}</p>}
          </div>
          <DialogFooter>
            <Button onClick={submitPayment} disabled={submitting || paymentLines.length === 0 || remaining > 0}>Selesaikan Transaksi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={holdsOpen} onOpenChange={setHoldsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaksi Ditahan (Hold)</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col divide-y divide-border">
            {holds.length === 0 && <p className="p-4 text-center text-sm text-content-muted">Tidak ada transaksi ditahan.</p>}
            {holds.map((h) => (
              <button key={h.id} type="button" onClick={() => recallHold(h)} className="flex items-center justify-between p-3 text-left text-sm hover:bg-bg">
                <div>
                  <p className="font-medium">{h.reference}</p>
                  <p className="text-xs text-content-muted">{h.item_count} item · {formatTime(h.held_at)}</p>
                </div>
                <Money amount={h.total} size="sm" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cashDialog !== null} onOpenChange={(open) => !open && setCashDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{cashDialog === 'in' ? 'Cash Masuk' : 'Cash Keluar'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label>Nominal</Label>
              <MoneyInput value={cashAmount} onChange={setCashAmount} />
            </div>
            <div>
              <Label>Keterangan</Label>
              <Input value={cashDescription} onChange={(e) => setCashDescription(e.target.value)} placeholder="Contoh: Setoran modal awal" />
            </div>
            {cashError && <p className="text-sm text-danger">{cashError}</p>}
          </div>
          <DialogFooter>
            <Button onClick={submitCash} disabled={cashSubmitting}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PosIndexShell({ children }: { children: ReactNode }) {
  const { props } = usePage<PageProps<PosIndexProps>>()

  return (
    <PosLayout
      outletName={props.outlet?.name}
      cashierName={props.auth.user?.name ?? '-'}
      sessionLabel={props.session ? `Sesi ${props.session.reference}` : 'Belum ada sesi'}
      hasActiveSession={props.session !== null}
      onCloseSession={() => router.visit(route('admin.cashier-session.index'))}
    >
      {children}
    </PosLayout>
  )
}

Index.layout = (page: ReactElement) => <PosIndexShell>{page}</PosIndexShell>
