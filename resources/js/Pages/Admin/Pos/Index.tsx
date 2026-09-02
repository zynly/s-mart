import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { router, usePage } from '@inertiajs/react'
import { useHotkeys } from 'react-hotkeys-hook'
import { toast } from 'sonner'
import {
  AlertCircle, ArrowDownCircle, ArrowUpCircle, Building2, Check, CheckCircle2, CheckSquare, ChevronLeft, ChevronRight, Clock, Coins, Copy, CreditCard, FileText, Filter, Flame, Folder, Gift, Info, Layers, Lock, Pause, Percent, Phone, PlusCircle, Printer, Receipt, RotateCcw,
  QrCode, ScanLine, Search, ShoppingCart, Sparkles, Store, Tag, Ticket, Trash2, UserCircle, Wallet, X, Zap,
} from 'lucide-react'
import PosLayout from '@/Layouts/PosLayout'
import { Money } from '@/Components/common/Money'
import { MoneyInput } from '@/Components/common/MoneyInput'
import { PinInput } from '@/Components/common/PinInput'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Badge } from '@/Components/ui/badge'
import { Checkbox } from '@/Components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { newIdempotencyKey } from '@/Lib/idempotency'
import { formatTime } from '@/Lib/date'
import { formatMoney } from '@/Lib/money'
import { apiPost, ApiError } from '@/Lib/api'
import { useMidtransSnap } from '@/Hooks/useMidtransSnap'
import { cn } from '@/Lib/utils'
import type { PageProps } from '@/Types'

// REVISI-UI-KASIR (perbaikan lanjutan) — Input/Select shadcn generik
// pakai token `dark:bg-input/30` yang aktif karena PosLayout memaksa
// class `dark` di <html>. Di atas card putih literal (bukan token
// tema), itu bikin field aktif terlihat pudar/disabled. Override
// eksplisit `dark:bg-white`/`dark:text-gray-900` (bukan cuma
// `bg-white` polos) supaya menang melawan default dark-mode itu.
const posFieldClass = 'border-gray-300 dark:border-border bg-white dark:bg-surface-alt text-gray-900 dark:text-content placeholder:text-gray-400 dark:placeholder:text-content-muted'
// SelectContent/SelectItem (popover dropdown Radix, bukan trigger-nya)
// pakai token `bg-popover`/`text-popover-foreground` yang sama-sama
// ikut resolve gelap di bawah `dark` yang dipaksa PosLayout — tanpa
// override ini dropdown-nya gelap padahal trigger di sekitarnya sudah
// terang, kontrasnya pecah (item terlihat "disabled").
const posDropdownClass = 'bg-white dark:bg-surface text-gray-900 dark:text-content [&_[data-slot=select-item]]:text-gray-900 dark:[&_[data-slot=select-item]]:text-content [&_[data-slot=select-item]:focus]:bg-gray-100 dark:[&_[data-slot=select-item]:focus]:bg-surface-alt'

type PaymentMethodRow = {
  id: number
  code: string
  name: string
  type: string
  allows_change: boolean
  requires_reference: boolean
  mdr_percent: number
  midtrans_code?: string | null
  is_active?: boolean
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
type SessionInfo = {
  id: number
  reference: string
  opened_at: string
  opening_cash?: number
  total_sales_cash?: number
  total_topup_cash?: number
  total_receivable_cash?: number
  total_cash_in?: number
  total_cash_out?: number
  total_drop?: number
  total_refund_cash?: number
  expected_cash?: number
  cash_account_id: number
  cashAccount?: { id: number; name: string; current_balance: number } | null
  cash_account?: { id: number; name: string; current_balance: number } | null
} | null
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
  gateway_status?: 'settlement' | 'capture' | 'pending'
}

type ActivePromoRow = {
  id: number
  code: string
  name: string
  description?: string | null
  type: string
  discount_type: string
  discount_value: number
  max_discount: number | null
  min_purchase: number | null
  buy_qty?: string | null
  get_qty?: string | null
  min_qty?: string | null
  scope: string
  start_time?: string | null
  end_time?: string | null
  days_of_week?: number[] | null
  products?: { id: number }[]
  categories?: { id: number }[]
}

type ActiveCouponRow = {
  id: number
  code: string
  name: string
  discount_type: 'percent' | 'amount'
  discount_value: number
  max_discount: number | null
  min_purchase: number | null
  valid_until: string
  source: string
  quota: number
  used_count: number
}

type BankAccountRow = {
  id: number
  bank_name: string
  account_number: string
  account_holder: string
}

type MidtransChannelProp = {
  code: string
  name: string
  category: string
  is_active: boolean
}

type PosIndexProps = {
  session: SessionInfo
  outlet: OutletInfo
  paymentMethods: PaymentMethodRow[]
  savedEnabledChannels?: string[]
  activeGateway?: string
  midtransChannels?: MidtransChannelProp[]
  bankAccounts?: BankAccountRow[]
  catalog: CatalogPage
  categories: CategoryRef[]
  holds: HoldRow[]
  activePromos?: ActivePromoRow[]
  activeCoupons?: ActiveCouponRow[]
  noPinThreshold: number
  pointValue: number
  midtransClientKey: string | null
  midtransIsProduction: boolean
}

export default function Index({
  session,
  outlet,
  paymentMethods = [],
  savedEnabledChannels = [],
  activeGateway = 'midtrans',
  midtransChannels = [],
  bankAccounts = [],
  catalog = { data: [], current_page: 1, last_page: 1, total: 0 },
  categories = [],
  holds = [],
  activePromos = [],
  activeCoupons = [],
  noPinThreshold = 0,
  pointValue = 100,
  midtransClientKey = null,
  midtransIsProduction = false,
}: PosIndexProps) {
  const [selectedPosCategories, setSelectedPosCategories] = useState<number[]>([])
  const [modalSelectedCats, setModalSelectedCats] = useState<number[]>([])
  const [catalogSearch, setCatalogSearch] = useState('')
  const [posCatModalOpen, setPosCatModalOpen] = useState(false)
  const [posCatModalSearch, setPosCatModalSearch] = useState('')
  const [catalogState, setCatalogState] = useState(catalog ?? { data: [], current_page: 1, last_page: 1, total: 0 })
  const [isCatalogLoading, setIsCatalogLoading] = useState(false)
  const catalogCache = useRef<Record<string, typeof catalog>>({})

  useEffect(() => {
    setCatalogState(catalog ?? { data: [], current_page: 1, last_page: 1, total: 0 })
  }, [catalog])

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchCatalog({ search: catalogSearch, page: 1 })
    }, 250)
    return () => clearTimeout(timer)
  }, [catalogSearch, fetchCatalog])

  const selectedCategoriesList = useMemo(
    () => categories.filter((c) => selectedPosCategories.includes(c.id)),
    [categories, selectedPosCategories]
  )

  const filteredModalCategories = useMemo(() => {
    if (!posCatModalSearch.trim()) return categories
    const q = posCatModalSearch.toLowerCase()
    return categories.filter((c) => c.name.toLowerCase().includes(q))
  }, [categories, posCatModalSearch])

  const fetchCatalog = useCallback(async (patch: { category_ids?: string; search?: string; page?: number }) => {
    const nextCatIds = patch.category_ids !== undefined ? patch.category_ids : selectedPosCategories.join(',')
    const nextSearch = patch.search !== undefined ? patch.search : catalogSearch
    const nextPage = patch.page ?? 1
    const cacheKey = `${nextCatIds}|${nextSearch}|${nextPage}`

    if (catalogCache.current[cacheKey]) {
      setCatalogState(catalogCache.current[cacheKey])
      return
    }

    setIsCatalogLoading(true)
    try {
      const url = new URL(route('pos.catalog'), window.location.origin)
      if (nextCatIds) url.searchParams.set('category_ids', nextCatIds)
      if (nextSearch) url.searchParams.set('search', nextSearch)
      url.searchParams.set('page', String(nextPage))

      const res = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
      if (res.ok) {
        const data = await res.json()
        catalogCache.current[cacheKey] = data
        setCatalogState(data)
      }
    } catch (err) {
      console.error('Failed to fetch catalog:', err)
    } finally {
      setIsCatalogLoading(false)
    }
  }, [selectedPosCategories, catalogSearch])
  const [cart, setCart] = useState<CartLine[]>([])
  const [member, setMember] = useState<MemberResult | null>(null)
  const [appliedCoupon, setAppliedCoupon] = useState('')
  const [showPromosModal, setShowPromosModal] = useState(false)
  const [promoModalTab, setPromoModalTab] = useState<'promos' | 'coupons'>('promos')
  const [promoTypeFilter, setPromoTypeFilter] = useState<string>('all')
  const [couponValidating, setCouponValidating] = useState(false)
  const [couponValidationResult, setCouponValidationResult] = useState<{
    valid: boolean
    discount: number
    message: string | null
    coupon?: ActiveCouponRow | null
  } | null>(null)
  const [barcode, setBarcode] = useState('')
  const [scanError, setScanError] = useState<string | null>(null)
  const [memberQuery, setMemberQuery] = useState('')
  const [memberResults, setMemberResults] = useState<MemberResult[]>([])
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [holdsOpen, setHoldsOpen] = useState(false)
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([])
  const [selectedMethodId, setSelectedMethodId] = useState('')
  const [directMethodId, setDirectMethodId] = useState<number | null>(null)
  const [cashInput, setCashInput] = useState<number>(0)
  const [creditWarning, setCreditWarning] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [midtransPayingKey, setMidtransPayingKey] = useState<string | null>(null)
  const snap = useMidtransSnap(midtransClientKey, midtransIsProduction)
  const [holdError, setHoldError] = useState<string | null>(null)
  const [cashDialog, setCashDialog] = useState<'in' | 'out' | null>(null)
  const [cashAmount, setCashAmount] = useState(0)
  const [cashDescription, setCashDescription] = useState('')
  const [cashError, setCashError] = useState<string | null>(null)
  const [cashSubmitting, setCashSubmitting] = useState(false)
  /** 'operational' = pengeluaran rutin, 'member_withdraw' = tarik tunai deposit anggota */
  const [cashOutMode, setCashOutMode] = useState<'operational' | 'member_withdraw'>('operational')
  /** anggota yang dipilih untuk tarik tunai (pre-filled dari member aktif di POS) */
  const [withdrawMember, setWithdrawMember] = useState<MemberResult | null>(null)
  const pageProps = usePage<PageProps & { flash?: { completed_sale_id?: number; completed_sale_ref?: string } }>().props


  useEffect(() => {
    if (pageProps.flash?.completed_sale_id && pageProps.flash?.completed_sale_ref) {
      setTxResultModal((prev) => {
        if (prev?.open && prev.saleId === pageProps.flash?.completed_sale_id) return prev
        return {
          open: true,
          type: 'success',
          title: 'Transaksi Berhasil!',
          message: `Transaksi kasir No. Nota ${pageProps.flash.completed_sale_ref} telah sukses disimpan.`,
          saleId: pageProps.flash?.completed_sale_id ?? null,
          saleRef: pageProps.flash?.completed_sale_ref ?? null,
          methodName: prev?.methodName || 'POS Kasir',
          amount: prev?.amount,
          cashReceived: prev?.cashReceived,
          changeAmount: prev?.changeAmount,
        }
      })
    }
  }, [pageProps.flash?.completed_sale_id, pageProps.flash?.completed_sale_ref])

  const idempotencyKeyRef = useRef(newIdempotencyKey())
  const barcodeRef = useRef<HTMLInputElement>(null)
  const memberInputRef = useRef<HTMLInputElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  const [pakasirModalUrl, setPakasirModalUrl] = useState<string | null>(null)
  const [pakasirModalOrderId, setPakasirModalOrderId] = useState<string | null>(null)
  const [pakasirModalAmount, setPakasirModalAmount] = useState<number | null>(null)
  const [insufficientDepositModal, setInsufficientDepositModal] = useState<{
    memberName: string
    memberNumber: string
    currentBalance: number
    requiredAmount: number
    shortage: number
  } | null>(null)

  const [txResultModal, setTxResultModal] = useState<{
    open: boolean
    type: 'success' | 'error'
    title: string
    message: string
    saleId?: number | null
    saleRef?: string | null
    amount?: number
    cashReceived?: number
    changeAmount?: number
    methodName?: string
  } | null>(null)


  function scrollCarousel(direction: -1 | 1) {
    carouselRef.current?.scrollBy({ left: direction * 320, behavior: 'smooth' })
  }

  const subtotal = useMemo(() => cart.reduce((sum, line) => sum + line.qty * line.unit_price, 0), [cart])
  const couponDiscount = couponValidationResult?.valid ? couponValidationResult.discount : 0

  const promoDiscount = useMemo(() => {
    if (activePromos.length === 0) return 0
    let totalDisc = 0
    for (const line of cart) {
      const lineSubtotal = line.qty * line.unit_price
      let maxLineDisc = 0

      for (const promo of activePromos) {
        const hasProducts = Array.isArray(promo.products) && promo.products.length > 0
        const hasCategories = Array.isArray(promo.categories) && promo.categories.length > 0

        let isEligible = false
        if (promo.type === 'product' || promo.type === 'tiered_qty' || promo.type === 'happy_hour' || promo.type === 'buy_x_get_y' || promo.type === 'bundle') {
          isEligible = hasProducts ? promo.products!.some((p) => p.id === line.product_id) : true
        } else if (promo.type === 'category') {
          isEligible = hasCategories ? promo.categories!.some((c) => c.id === (line as any).category_id) : true
        } else if (promo.type === 'clearance') {
          isEligible = hasProducts ? promo.products!.some((p) => p.id === line.product_id) : false
        }

        if (!isEligible) continue

        if (promo.min_qty && line.qty < Number(promo.min_qty)) continue

        let disc = 0
        if (promo.discount_type === 'percent') {
          disc = Math.round(lineSubtotal * (promo.discount_value / 100))
        } else if (promo.discount_type === 'amount') {
          disc = promo.discount_value * line.qty
        } else if (promo.discount_type === 'fixed_price') {
          disc = Math.max(0, lineSubtotal - promo.discount_value * line.qty)
        }

        if (promo.max_discount && promo.max_discount > 0) {
          disc = Math.min(disc, promo.max_discount)
        }
        if (disc > maxLineDisc) {
          maxLineDisc = disc
        }
      }
      totalDisc += Math.min(lineSubtotal, maxLineDisc)
    }
    return totalDisc
  }, [cart, activePromos])

  const finalPayable = Math.max(0, subtotal - couponDiscount - promoDiscount)

  const activeMethod = useMemo(() => {
    if (directMethodId) {
      const found = paymentMethods.find((pm) => pm.id === directMethodId)
      if (found) return found
    }
    return paymentMethods.find((pm) => pm.type === 'cash') ?? paymentMethods[0] ?? null
  }, [directMethodId, paymentMethods])

  const isCash = activeMethod?.type === 'cash'
  const changeAmount = isCash && cashInput > finalPayable ? cashInput - finalPayable : 0
  const underpaidAmount = isCash && cashInput > 0 && cashInput < finalPayable ? finalPayable - cashInput : 0

  const handleApplyCoupon = useCallback(
    async (codeToApply?: string) => {
      const code = (codeToApply ?? appliedCoupon).trim().toUpperCase()
      if (!code) {
        setAppliedCoupon('')
        setCouponValidationResult(null)
        return
      }

      setCouponValidating(true)
      try {
        const res = await apiPost<{ valid: boolean; discount: number; message?: string | null; coupon?: any }>(
          route('pos.validate-coupon'),
          {
            code,
            items: cart.map((c) => ({ product_id: c.product_id, subtotal: c.qty * c.unit_price })),
            member_id: member?.id ?? null,
          }
        )

        if (res.valid) {
          setAppliedCoupon(code)
          setCouponValidationResult({
            valid: true,
            discount: res.discount,
            message: null,
            coupon: res.coupon,
          })
          toast.success(`Kupon ${code} berhasil diterapkan!`, {
            description: `Mendapatkan potongan senilai ${formatMoney(res.discount)}.`,
          })
        } else {
          setCouponValidationResult({
            valid: false,
            discount: 0,
            message: res.message || 'Kupon tidak valid untuk transaksi ini.',
            coupon: null,
          })
          toast.error(`Kupon tidak valid: ${res.message || 'Syarat kupon belum terpenuhi.'}`)
        }
      } catch (err: any) {
        toast.error(err?.message || 'Gagal memvalidasi kupon.')
      } finally {
        setCouponValidating(false)
      }
    },
    [appliedCoupon, cart, member]
  )

  const handleRemoveCoupon = () => {
    setAppliedCoupon('')
    setCouponValidationResult(null)
    toast.info('Kupon dibatalkan dari transaksi.')
  }

  const handleSelectCouponFromModal = (couponCode: string) => {
    setAppliedCoupon(couponCode)
    setShowPromosModal(false)
    void handleApplyCoupon(couponCode)
  }

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
        return
      }

      if (data.price <= 0) {
        toast.error(`Produk "${data.product.name}" belum ada harga. Tidak dapat dipilih.`)
        return
      }

      addLine(data.product, data.unit, data.price, data.qty_multiplier)
      toast.success(`Produk "${data.product.name}" ditambahkan ke keranjang via Barcode.`)
      setCatalogSearch('')
      void fetchCatalog({ search: '', page: 1 })
    } catch {
      // ignore
    } finally {
      focusScan()
    }
  }

  function updateQty(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, qty: Math.max(0, Math.round((l.qty + delta) * 1000) / 1000) } : l))
        .filter((l) => l.qty > 0),
    )
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
    setCashPin('')
    setWithdrawMemberPin('')
    setCashError(null)
    setCashOutMode('operational')
    setWithdrawMember(member ?? null)
    setCashDialog(type)
  }

  function submitCash() {
    if (!session || !cashDialog) return
    if (cashAmount <= 0) {
      setCashError('Nominal harus lebih dari 0.')
      return
    }

    const drawerBalance = session.expected_cash 
      ?? ((session.opening_cash ?? 0)
        + (session.total_sales_cash ?? 0)
        + (session.total_topup_cash ?? 0)
        + (session.total_receivable_cash ?? 0)
        + (session.total_cash_in ?? 0)
        - (session.total_cash_out ?? 0)
        - (session.total_drop ?? 0)
        - (session.total_refund_cash ?? 0))

    if (cashDialog === 'in') {
      if (!cashPin.trim() || cashPin.length < 6) {
        setCashError('PIN Kasir Penerima (6 digit) wajib diisi.')
        return
      }
    }

    if (cashDialog === 'out') {
      if (!cashPin.trim() || cashPin.length < 6) {
        setCashError('PIN Kasir / Supervisor (6 digit) wajib diisi.')
        return
      }

      if (cashAmount > drawerBalance) {
        setInsufficientCashModal({
          open: true,
          title: 'Transaksi Kas Keluar Ditolak!',
          requestedAmount: cashAmount,
          currentBalance: drawerBalance,
          shortage: cashAmount - drawerBalance,
          message: 'Nominal pengeluaran kas melebihi saldo kas yang ada di laci kasir. Transaksi tidak dapat diproses.',
        })
        toast.error('Kas Keluar Ditolak: Cash on hand tidak mencukupi!')
        return
      }

      if (cashOutMode === 'member_withdraw') {
        if (!withdrawMember) {
          setCashError('Pilih anggota terlebih dahulu.')
          return
        }
        if (cashAmount > withdrawMember.balance_cache) {
          setCashError(`Saldo deposit anggota (Rp ${withdrawMember.balance_cache.toLocaleString('id-ID')}) tidak mencukupi.`)
          return
        }
        if (!withdrawMemberPin.trim() || withdrawMemberPin.length < 6) {
          setCashError('PIN Anggota / Santri (6 digit) wajib diisi.')
          return
        }

        setCashSubmitting(true)
        setCashError(null)

        router.post(
          route('admin.cash.member-withdraw'),
          {
            member_id: withdrawMember.id,
            amount: cashAmount,
            pin: cashPin,
            member_pin: withdrawMemberPin,
            note: cashDescription || `Tarik tunai deposit di kasir oleh ${withdrawMember.name}`,
          },
          {
            preserveScroll: true,
            onSuccess: () => {
              setCashDialog(null)
              toast.success(`Tarik tunai Rp ${cashAmount.toLocaleString('id-ID')} berhasil untuk ${withdrawMember.name}.`)
              if (member?.id === withdrawMember.id) {
                setMember((prev) => (prev ? { ...prev, balance_cache: prev.balance_cache - cashAmount } : null))
              }
              setTxResultModal({
                open: true,
                type: 'success',
                title: 'Tarik Tunai Berhasil!',
                message: `Tarik tunai deposit senilai Rp ${cashAmount.toLocaleString('id-ID')} berhasil diproses untuk ${withdrawMember.name}.`,
                amount: cashAmount,
                methodName: 'Tarik Tunai Deposit',
              })
            },
            onError: (errors) => setCashError(Object.values(errors)[0] ?? 'Gagal memproses tarik tunai.'),
            onFinish: () => setCashSubmitting(false),
          },
        )
        return
      }
    }

    if (!cashDescription.trim()) {
      setCashError('Keterangan wajib diisi.')
      return
    }

    setCashSubmitting(true)
    setCashError(null)

    const isOut = cashDialog === 'out'
    const desc = cashDescription

    router.post(
      route(cashDialog === 'in' ? 'admin.cash.in' : 'admin.cash.out'),
      {
        cash_account_id: session.cash_account_id,
        amount: cashAmount,
        pin: cashPin,
        description: cashDescription,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setCashDialog(null)
          toast.success(isOut ? 'Kas keluar berhasil dicatat.' : 'Kas masuk berhasil dicatat.')
          setTxResultModal({
            open: true,
            type: 'success',
            title: isOut ? 'Kas Keluar Berhasil!' : 'Kas Masuk Berhasil!',
            message: `${isOut ? 'Pengeluaran' : 'Setoran'} kas laci senilai Rp ${cashAmount.toLocaleString('id-ID')} (${desc}) berhasil dicatat.`,
            amount: cashAmount,
            methodName: isOut ? 'Kas Keluar Laci' : 'Kas Masuk Laci',
          })
        },
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
    setCashInput(subtotal)
    // Temuan audit keamanan: key HARUS dibuat sekali per keranjang, bukan
    // per klik submit — kalau tidak, retry (klik dobel/network lambat)
    // mengirim key baru tiap kali dan idempotency di backend jadi tidak
    // berarti (nota ganda, stok/saldo terpotong ganda).
    idempotencyKeyRef.current = newIdempotencyKey()
    setPaymentOpen(true)
  }

  function methodEligible(pm: PaymentMethodRow): boolean {
    if (pm.type === 'deposit') return member !== null
    if (pm.type === 'credit') return member !== null && member.type !== 'santri'

    return true
  }

  async function addPaymentLine() {
    const pm = paymentMethods.find((p) => String(p.id) === selectedMethodId)
    if (!pm || remaining <= 0) return

    const amount = remaining

    const line: PaymentLine = {
      key: `${pm.id}-${Date.now()}`,
      payment_method_id: pm.id,
      code: pm.code,
      name: pm.name,
      type: pm.type,
      amount,
      received_amount: pm.allows_change ? amount : undefined,
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

    // Langsung buka Snap Midtrans, tanpa klik tombol terpisah — begitu
    // kasir pilih QRIS/E-Wallet/Transfer, popup pembayaran langsung
    // muncul. reference_no tetap bisa diisi manual sebagai fallback
    // (input tetap ada) kalau Midtrans gagal/ditutup tanpa bayar.
    if (pm.type === 'qris' || pm.type === 'ewallet' || pm.type === 'transfer') {
      void payLineWithMidtrans(line)
    }
  }

  function updatePaymentLine(key: string, patch: Partial<PaymentLine>) {
    setPaymentLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  async function payLineWithMidtrans(line: PaymentLine) {
    setMidtransPayingKey(line.key)

    type SnapResult = { transaction_id?: string; transaction_status?: 'settlement' | 'capture' | 'pending' }
    const applyResult = (result: unknown) => {
      const r = result as SnapResult
      updatePaymentLine(line.key, { reference_no: r?.transaction_id ?? '', gateway_status: r?.transaction_status })
      setMidtransPayingKey(null)
    }

    try {
      const res = await apiPost<{ provider?: string; token?: string; payment_url?: string; order_id?: string }>(
        route('pos.midtrans.create-transaction'),
        { amount: line.amount, type: line.type }
      )

      if (res.provider === 'pakasir' || res.payment_url) {
        setPakasirModalUrl(res.payment_url || null)
        setPakasirModalOrderId(res.order_id || null)
        setPakasirModalAmount(line.amount)
        setMidtransPayingKey(null)
      } else if (res.token) {
        snap.pay(res.token, {
          onSuccess: applyResult,
          onPending: applyResult,
          onError: () => {
            setPaymentError('Pembayaran gagal diproses. Coba lagi.')
            setMidtransPayingKey(null)
          },
          onClose: () => setMidtransPayingKey(null),
        })
      }
    } catch (err) {
      setPaymentError(err instanceof ApiError ? err.firstError() : 'Gagal memulai pembayaran.')
      setMidtransPayingKey(null)
    }
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

    // Validasi PIN di setiap payment line
    for (const line of paymentLines) {
      if (line.type === 'cash' && (!line.pin || line.pin.length < 6)) {
        setPaymentError('Pembayaran Tunai memerlukan PIN kasir 6-digit.')
        toast.error('PIN Kasir 6-digit wajib diisi pada baris pembayaran Tunai.')
        return
      }
      if (line.type === 'deposit' && (!line.pin || line.pin.length < 6)) {
        setPaymentError('Pembayaran Saldo Deposit memerlukan PIN anggota 6-digit.')
        toast.error('PIN Anggota 6-digit wajib diisi pada baris Saldo Deposit.')
        return
      }
      if (line.type === 'credit' && (!line.pin || line.pin.length < 6)) {
        setPaymentError('Pembayaran Kredit / Tempo memerlukan PIN anggota 6-digit.')
        toast.error('PIN Anggota 6-digit wajib diisi pada baris Kredit / Tempo.')
        return
      }
      if (line.type === 'transfer' && (!line.reference_no || !line.pin || line.pin.length < 6)) {
        setPaymentError('Pembayaran Transfer Manual memerlukan No. Referensi & PIN otorisasi 6-digit.')
        toast.error('No. Referensi & PIN otorisasi wajib diisi pada baris Transfer Manual.')
        return
      }
    }

    setSubmitting(true)
    setPaymentError(null)

    router.post(
      route('pos.sales.store'),
      {
        outlet_id: outlet.id,
        cashier_session_id: session.id,
        member_id: member?.id ?? null,
        coupon_code: appliedCoupon.trim() ? appliedCoupon.trim() : null,
        items: cart.map((l) => ({ product_id: l.product_id, unit_id: l.unit_id, qty: l.qty, unit_price: l.unit_price, product_name: l.product_name, unit_code: l.unit_code })),
        payments: paymentLines.map((l) => ({
          payment_method_id: l.payment_method_id,
          amount: l.amount,
          received_amount: l.received_amount,
          reference_no: l.reference_no,
          pin: l.pin,
          point_used: l.point_used,
          gateway_status: l.gateway_status,
        })),
      },
      {
        onSuccess: (page) => {
          const flash = (page.props as any).flash
          const saleId = flash?.completed_sale_id
          const saleRef = flash?.completed_sale_ref

          toast.success('Pembayaran Berhasil! Transaksi kasir telah dicatat.', {
            description: 'Keranjang belanja telah dikosongkan.',
          })

          if (saleId) setLastSaleId(saleId)

          setTxResultModal({
            open: true,
            type: 'success',
            title: 'Transaksi Multi-Metode Berhasil!',
            message: `Pembayaran senilai Rp ${finalPayable.toLocaleString('id-ID')} berhasil dicatat ke sistem.`,
            saleId: saleId ?? null,
            saleRef: saleRef ?? null,
            amount: finalPayable,
            methodName: 'Multi Pembayaran',
          })

          setCart([])
          setMember(null)
          setAppliedCoupon('')
          setPaymentOpen(false)
          idempotencyKeyRef.current = newIdempotencyKey()
        },
        onError: (errors) => {
          const msg = Object.values(errors)[0] ?? 'Gagal menyelesaikan transaksi.'
          setPaymentError(msg)
          toast.error(`Transaksi Gagal: ${msg}`)
        },
        onFinish: () => setSubmitting(false),
      },
    )
  }

  // Modal Validasi Cash on Hand Kas Keluar
  const [insufficientCashModal, setInsufficientCashModal] = useState<{
    open: boolean
    title: string
    requestedAmount: number
    currentBalance: number
    shortage: number
    message: string
  } | null>(null)

  // Dialog State untuk Metode Internal/Offline
  const [methodDialog, setMethodDialog] = useState<
    | { type: 'cash' }
    | { type: 'deposit' }
    | { type: 'card' }
    | { type: 'credit'; limit: number; active: number }
    | { type: 'transfer' }
    | null
  >(null)

  const [cashPin, setCashPin] = useState('')
  const [withdrawMemberPin, setWithdrawMemberPin] = useState('')
  const [depositPin, setDepositPin] = useState('')
  const [creditPin, setCreditPin] = useState('')
  const [lastSaleId, setLastSaleId] = useState<number | null>(null)
  const [edcRefNo, setEdcRefNo] = useState('')
  const [edcBank, setEdcBank] = useState('BCA')
  const [transferRefNo, setTransferRefNo] = useState('')
  const [transferPin, setTransferPin] = useState('')
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null)
  const selectedBankRow = useMemo(() => {
    if (!bankAccounts || bankAccounts.length === 0) return null
    if (selectedBankId) {
      return bankAccounts.find((b) => b.id === selectedBankId) ?? bankAccounts[0]
    }
    return bankAccounts[0]
  }, [bankAccounts, selectedBankId])
  const [methodDialogError, setMethodDialogError] = useState<string | null>(null)

  function executeSaleStore(extraPayload: {
    pin?: string
    reference_no?: string
    coupon_code?: string
  } = {}) {
    if (!session || !outlet || !activeMethod) return

    setSubmitting(true)
    setPaymentError(null)

    const finalReceived = isCash ? (cashInput > 0 ? cashInput : finalPayable) : finalPayable
    const finalCouponCode = extraPayload.coupon_code ?? (appliedCoupon.trim() ? appliedCoupon.trim() : null)

    router.post(
      route('pos.sales.store'),
      {
        outlet_id: outlet.id,
        cashier_session_id: session.id,
        member_id: member?.id ?? null,
        coupon_code: finalCouponCode,
        items: cart.map((l) => ({ product_id: l.product_id, unit_id: l.unit_id, qty: l.qty, unit_price: l.unit_price, product_name: l.product_name, unit_code: l.unit_code })),
        payments: [
          {
            payment_method_id: activeMethod.id,
            amount: finalPayable,
            received_amount: activeMethod.allows_change ? finalReceived : finalPayable,
            reference_no: extraPayload.reference_no ?? null,
            pin: extraPayload.pin ?? null,
          },
        ],
      },
      {
        headers: { 'X-Idempotency-Key': idempotencyKeyRef.current },
        onSuccess: (page) => {
          const flash = page.props.flash as any
          const saleId = flash?.completed_sale_id
          const saleRef = flash?.completed_sale_ref
          const change = isCash && cashInput > finalPayable ? cashInput - finalPayable : 0
          const changeInfo = change > 0 ? `Kembalian: Rp ${change.toLocaleString('id-ID')}. ` : ''

          toast.success('Pembayaran Berhasil! Transaksi telah disimpan.', {
            description: `${changeInfo}Keranjang kasir telah dikosongkan.`,
          })

          if (saleId) setLastSaleId(saleId)

          setTxResultModal({
            open: true,
            type: 'success',
            title: 'Transaksi Berhasil!',
            message: `Pembayaran senilai Rp ${finalPayable.toLocaleString('id-ID')} berhasil dicatat ke sistem.`,
            saleId: saleId ?? null,
            saleRef: saleRef ?? null,
            amount: finalPayable,
            cashReceived: isCash ? (cashInput > 0 ? cashInput : finalPayable) : finalPayable,
            changeAmount: change,
            methodName: activeMethod?.name ?? 'Tunai',
          })

          setCart([])
          setMember(null)
          setAppliedCoupon('')
          setCouponValidationResult(null)
          setCashInput(0)
          setCashPin('')
          setDepositPin('')
          setCreditPin('')
          setTransferPin('')
          setTransferRefNo('')
          setPaymentError(null)
          setMethodDialog(null)
          idempotencyKeyRef.current = newIdempotencyKey()
        },
        onError: (errors) => {
          const msg = Object.values(errors)[0] ?? 'Gagal menyelesaikan transaksi.'
          setPaymentError(msg)
          setMethodDialogError(msg)
          toast.error(`Transaksi Gagal: ${msg}`)

          setTxResultModal({
            open: true,
            type: 'error',
            title: 'Transaksi Gagal',
            message: msg,
          })
        },
        onFinish: () => setSubmitting(false),
      },
    )
  }

  async function handleDirectSubmit() {
    if (!session || !outlet || cart.length === 0 || finalPayable < 0 || !activeMethod) return

    if (isCash && cashInput > 0 && cashInput < finalPayable) {
      setPaymentError(`Uang bayar kurang dari total belanja.`)
      return
    }

    // Helper to request member selection with toast & auto-focus
    const requireMember = (methodName: string) => {
      const msg = `Metode ${methodName} membutuhkan anggota/santri terpilih.`
      setPaymentError(msg)
      toast.warning(msg, {
        description: 'Silakan cari & pilih anggota terlebih dahulu di kolom pelanggan.',
      })
      setTimeout(() => {
        memberInputRef.current?.focus()
        memberInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }

    // 0. Tunai (Cash) -> Wajib Verifikasi PIN Kasir
    if (activeMethod.type === 'cash') {
      setCashPin('')
      setMethodDialogError(null)
      setMethodDialog({ type: 'cash' })
      return
    }

    // 1. Saldo Deposit -> Wajib Verifikasi PIN Customer (selalu)
    if (activeMethod.type === 'deposit') {
      if (!member) {
        requireMember('Saldo Deposit')
        return
      }
      if (member.balance_cache < finalPayable) {
        const shortage = finalPayable - member.balance_cache
        const msg = `Saldo deposit anggota (Rp ${member.balance_cache.toLocaleString('id-ID')}) tidak mencukupi untuk pembayaran Rp ${finalPayable.toLocaleString('id-ID')}.`
        setPaymentError(msg)
        setInsufficientDepositModal({
          memberName: member.name,
          memberNumber: member.member_number,
          currentBalance: member.balance_cache,
          requiredAmount: finalPayable,
          shortage,
        })
        return
      }
      setDepositPin('')
      setMethodDialogError(null)
      setMethodDialog({ type: 'deposit' })
      return
    }

    // 2. Kartu Debit / EDC
    if (activeMethod.type === 'card') {
      setEdcRefNo('')
      setEdcBank('BCA')
      setMethodDialogError(null)
      setMethodDialog({ type: 'card' })
      return
    }

    // 3. Kredit / Tempo -> Wajib PIN Customer
    if (activeMethod.type === 'credit') {
      if (!member) {
        requireMember('Kredit / Tempo')
        return
      }
      if (member.type === 'santri') {
        const msg = 'Anggota santri tidak diizinkan menggunakan metode Kredit/Tempo.'
        setPaymentError(msg)
        toast.error(msg)
        return
      }
      setCreditPin('')
      try {
        const res = await fetch(`${route('pos.credit-check')}?member_id=${member.id}&amount=${finalPayable}`)
        const data = await res.json()
        if (!data.allowed) {
          const msg = `Limit piutang terlampaui: aktif Rp ${(data.active ?? 0).toLocaleString('id-ID')} dari limit Rp ${(data.limit ?? 0).toLocaleString('id-ID')}.`
          setPaymentError(msg)
          toast.error(msg)
          return
        }
        setMethodDialogError(null)
        setMethodDialog({ type: 'credit', limit: data.limit, active: data.active })
      } catch {
        setMethodDialogError(null)
        setMethodDialog({ type: 'credit', limit: member.receivable_limit, active: 0 })
      }
      return
    }

    // 4. Transfer Bank Manual -> Wajib PIN Kasir + No Ref
    if (activeMethod.type === 'transfer' && !activeMethod.midtrans_code) {
      setTransferRefNo('')
      setTransferPin('')
      setMethodDialogError(null)
      setMethodDialog({ type: 'transfer' })
      return
    }

    // 5. JIKA METODE NON-TUNAI ONLINE (qris, ewallet, midtrans transfer): Panggil Gateway Inline Modal Overlay
    if (activeMethod.type === 'qris' || activeMethod.type === 'ewallet' || (activeMethod.type === 'transfer' && activeMethod.midtrans_code)) {
      try {
        const res = await apiPost<{ provider?: string; token?: string; payment_url?: string; order_id?: string }>(route('pos.midtrans.create-transaction'), {
          amount: finalPayable,
          type: activeMethod.type,
          coupon_code: appliedCoupon.trim() ? appliedCoupon.trim() : null,
        })

        type SnapResult = { transaction_id?: string; transaction_status?: 'settlement' | 'capture' | 'pending' }

        const completeSaleWithSnap = (result: unknown) => {
          const r = result as SnapResult
          const refNo = r?.transaction_id ?? `PG-${Date.now()}`
          const status = r?.transaction_status ?? 'settlement'

          router.post(
            route('pos.sales.store'),
            {
              outlet_id: outlet.id,
              cashier_session_id: session.id,
              member_id: member?.id ?? null,
              coupon_code: appliedCoupon.trim() ? appliedCoupon.trim() : null,
              items: cart.map((l) => ({ product_id: l.product_id, unit_id: l.unit_id, qty: l.qty, unit_price: l.unit_price, product_name: l.product_name, unit_code: l.unit_code })),
              payments: [
                {
                  payment_method_id: activeMethod.id,
                  amount: finalPayable,
                  received_amount: finalPayable,
                  reference_no: refNo,
                  gateway_status: status,
                },
              ],
            },
            {
              headers: { 'X-Idempotency-Key': idempotencyKeyRef.current },
              onSuccess: (page) => {
                const flash = (page.props as any).flash
                const saleId = flash?.completed_sale_id
                const saleRef = flash?.completed_sale_ref

                toast.success('Pembayaran Online Berhasil!', {
                  description: 'Transaksi telah berhasil dicatat ke sistem.',
                })

                setTxResultModal({
                  open: true,
                  type: 'success',
                  title: 'Pembayaran Online Berhasil!',
                  message: `Pembayaran online senilai Rp ${finalPayable.toLocaleString('id-ID')} berhasil diverifikasi dan dicatat.`,
                  saleId: saleId ?? null,
                  saleRef: saleRef ?? null,
                  amount: finalPayable,
                  methodName: activeMethod?.name ?? 'Midtrans / Online PG',
                })

                setCart([])
                setMember(null)
                setAppliedCoupon('')
                setCouponValidationResult(null)
                setCashInput(0)
                setPaymentError(null)
                idempotencyKeyRef.current = newIdempotencyKey()
              },
              onError: (errors) => {
                const msg = Object.values(errors)[0] ?? 'Gagal menyelesaikan transaksi.'
                setPaymentError(msg)
                toast.error(`Transaksi Online Gagal: ${msg}`)
              },
              onFinish: () => setSubmitting(false),
            },
          )
        }

        if (res.provider === 'pakasir' || res.payment_url) {
          setPakasirModalUrl(res.payment_url || null)
          setPakasirModalOrderId(res.order_id || null)
          setPakasirModalAmount(finalPayable)
          setSubmitting(false)
          toast.info('Memuat QRIS Pakasir Payment Gateway...')
        } else if (res.token) {
          snap.pay(res.token, {
            onSuccess: completeSaleWithSnap,
            onPending: completeSaleWithSnap,
            onError: () => {
              setPaymentError('Pembayaran gagal diproses. Silakan coba lagi.')
              setSubmitting(false)
            },
            onClose: () => {
              setSubmitting(false)
            },
          })
        }
      } catch (err) {
        setPaymentError(err instanceof ApiError ? err.firstError() : 'Gagal memulai transaksi pembayaran.')
        setSubmitting(false)
      }
      return
    }

    // 8. Metode Tunai & Pembayaran Default
    executeSaleStore()
  }

  useHotkeys('f3', (e) => { e.preventDefault(); focusScan() })
  useHotkeys('f4', (e) => { e.preventDefault(); doHold() })
  useHotkeys('f5', (e) => { e.preventDefault(); setHoldsOpen(true) })
  useHotkeys('f8', (e) => {
    e.preventDefault()
    if (lastSaleId) {
      window.open(route('pos.sales.receipt-pdf', lastSaleId), '_blank')
    } else {
      toast.info('Belum ada transaksi penjualan yang diselesaikan pada sesi ini.')
    }
  })
  useHotkeys('f9', (e) => { e.preventDefault(); handleDirectSubmit() })
  useHotkeys('f11', (e) => { e.preventDefault(); openCashDialog('in') })
  useHotkeys('f12', (e) => { e.preventDefault(); openCashDialog('out') })
  useHotkeys('esc', () => { setPaymentOpen(false); setHoldsOpen(false); setCashDialog(null) })

  if (!session) {
    return (
      <PosLayout
        outletName={outlet?.name}
        cashierName={pageProps.auth.user?.name ?? 'Kasir'}
        sessionLabel="Belum Ada Sesi"
        hasActiveSession={false}
        onCloseSession={() => router.visit(route('admin.cashier-session.index'))}
      >
        <div className="flex h-[calc(100vh-3.5rem)] w-full items-center justify-center bg-slate-50/70 p-4 dark:bg-slate-950/70 sm:p-6">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 p-6 sm:p-8 text-center shadow-xl shadow-slate-900/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
            {/* Ambient Accent Glows */}
            <div className="absolute -top-16 -left-16 size-40 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 size-40 rounded-full bg-navy-500/10 blur-3xl pointer-events-none" />

            <div className="relative flex flex-col items-center">
              {/* Icon Container with Floating Lock Badge */}
              <div className="relative mb-5 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500/15 via-amber-400/10 to-amber-500/5 border border-amber-500/20 text-amber-600 shadow-inner dark:from-amber-500/25 dark:to-amber-500/10 dark:text-amber-400">
                <Store className="size-9" />
                <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-amber-500 text-navy-950 ring-4 ring-white dark:ring-slate-900 shadow-md">
                  <Lock className="size-3.5 stroke-[2.5]" />
                </span>
              </div>

              {/* Status Pill */}
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                Sesi Kasir Nonaktif
              </div>

              {/* Heading */}
              <h2 className="mb-2 text-xl font-bold tracking-tight text-navy-950 dark:text-white sm:text-2xl">
                Belum Ada Sesi Kasir Aktif
              </h2>

              {/* Description */}
              <p className="mb-6 text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
                Untuk mulai melayani transaksi penjualan &amp; mencatat alur kas secara otomatis, silakan buka sesi kasir baru terlebih dahulu.
              </p>

              {/* Primary Action Button */}
              <Button
                size="lg"
                onClick={() => router.visit(route('admin.cashier-session.index'))}
                className="w-full gap-2 rounded-xl bg-gradient-to-r from-navy-900 via-navy-800 to-navy-950 py-6 text-base font-bold text-white shadow-lg shadow-navy-950/20 hover:from-navy-950 hover:to-navy-900 hover:shadow-xl dark:from-amber-500 dark:via-amber-400 dark:to-amber-500 dark:text-navy-950 dark:hover:from-amber-400 dark:hover:to-amber-500 transition-all duration-200 active:scale-[0.98]"
              >
                <PlusCircle className="size-5" />
                Buka Sesi Kasir Sekarang
              </Button>
            </div>
          </div>
        </div>
      </PosLayout>
    )
  }

  return (
    <PosLayout
      outletName={outlet?.name}
      cashierName={pageProps.auth.user?.name ?? 'Kasir'}
      sessionLabel={session ? `Sesi ${session.reference}` : 'Belum ada sesi'}
      hasActiveSession={session !== null}
      onCloseSession={() => router.visit(route('admin.cashier-session.index'))}
      actionToolbar={
        <div className="flex w-full max-w-4xl items-center justify-between gap-1.5 py-0.5 px-1">
          {[
            { key: 'F3', label: 'Cari', icon: Search, onClick: focusScan, isPrimary: false },
            { key: 'F4', label: 'Tahan', icon: Pause, onClick: doHold, disabled: cart.length === 0, isPrimary: false },
            { key: 'F5', label: 'Panggil', icon: Phone, onClick: () => setHoldsOpen(true), isPrimary: false },
            {
              key: 'F8',
              label: 'Nota Terakhir',
              icon: Printer,
              onClick: () => {
                if (lastSaleId) {
                  window.open(route('pos.sales.receipt-pdf', lastSaleId), '_blank')
                } else {
                  toast.info('Belum ada transaksi penjualan yang diselesaikan pada sesi ini.')
                }
              },
              isPrimary: false,
            },
            { key: 'F9', label: 'Bayar', icon: CreditCard, onClick: handleDirectSubmit, disabled: cart.length === 0, isPrimary: true },
            { key: 'F11', label: 'Cash Masuk', icon: ArrowDownCircle, onClick: () => openCashDialog('in'), isPrimary: false },
            { key: 'F12', label: 'Cash Keluar', icon: ArrowUpCircle, onClick: () => openCashDialog('out'), isPrimary: false },
          ].map((btn) => {
            const Icon = btn.icon
            const isDisabled = btn.disabled
            const isPrimary = btn.isPrimary && !isDisabled

            return (
              <button
                key={btn.key}
                type="button"
                onClick={btn.onClick}
                disabled={isDisabled}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition-all duration-150 active:scale-95 whitespace-nowrap shadow-2xs',
                  isDisabled
                    ? 'border-border/60 bg-muted/40 text-content-muted opacity-40 cursor-not-allowed'
                    : isPrimary
                      ? 'border-emerald-500 bg-emerald-600 text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500 hover:border-emerald-400 ring-2 ring-emerald-400/40 font-extrabold'
                      : 'border-border/90 bg-surface neu-flat text-navy-950 hover:border-amber-400/80 hover:bg-amber-50/70 hover:text-navy-950 shadow-2xs',
                )}
              >
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 font-mono text-[10px] font-black tracking-wider shadow-2xs',
                    isDisabled
                      ? 'bg-muted text-content-muted'
                      : isPrimary
                        ? 'bg-emerald-800 text-white border border-emerald-400/40'
                        : 'bg-amber-400 text-navy-950 shadow-2xs font-bold',
                  )}
                >
                  {btn.key}
                </span>
                <Icon className={cn('size-3.5 shrink-0', isPrimary ? 'text-white' : 'text-navy-700')} />
                <span className="truncate">{btn.label}</span>
              </button>
            )
          })}
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 h-full w-full overflow-hidden">
        {/* GRID 1: KATALOG PRODUK & SEARCH (Kolom Kiri Terbesar - Flex Expand) */}
        <section className="flex flex-1 min-w-0 flex-col gap-3 overflow-hidden border-r border-gray-200 dark:border-border bg-gray-50/60 dark:bg-bg p-3 min-h-0 h-full">
          {/* Barcode & Search Bar Utama (Terintegrasi F3) */}
          <div className="relative shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={barcodeRef}
              autoFocus
              type="text"
              placeholder="Scan barcode scanner atau cari nama / SKU produk… (F3)"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void submitScan(catalogSearch)
                }
              }}
              className="h-10 w-full rounded-xl border border-gray-200 dark:border-border bg-white/90 dark:bg-surface-alt/90 pl-10 pr-10 text-sm text-gray-900 dark:text-content placeholder:text-gray-400 dark:placeholder:text-content-muted neu-pressed transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
            />
            {catalogSearch ? (
              <button
                type="button"
                onClick={() => {
                  setCatalogSearch('')
                  void fetchCatalog({ search: '', page: 1 })
                }}
                className="absolute right-9 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-content"
              >
                <X className="size-4" />
              </button>
            ) : null}
            <ScanLine className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-content-muted" />
          </div>
          {scanError && <p className="-mt-2 text-sm text-danger">{scanError}</p>}

          {/* Filter Bar & Header Katalog */}
          <div className="flex shrink-0 flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-gray-200 dark:border-border pb-2.5">
            <div className="flex items-center flex-wrap gap-2 min-w-0">
              <h2 className="text-xs font-bold uppercase tracking-wider text-navy-800 dark:text-content-muted">Katalog Produk</h2>
              <Badge variant="secondary" className="text-[10px] bg-navy-100 dark:bg-surface-alt text-navy-800 dark:text-content font-semibold">
                {catalogState.total} produk
              </Badge>
              {selectedCategoriesList.length > 0 && (
                <div className="flex items-center flex-wrap gap-1">
                  {selectedCategoriesList.slice(0, 3).map((cat) => (
                    <Badge key={cat.id} variant="outline" className="text-[10px] gap-1 bg-primary/10 text-primary border-primary/30 py-0.5">
                      <Folder className="size-2.5" />
                      <span className="max-w-[100px] truncate">{cat.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = selectedPosCategories.filter((id) => id !== cat.id)
                          setSelectedPosCategories(next)
                          void fetchCatalog({ category_ids: next.join(','), page: 1 })
                        }}
                        className="ml-0.5 text-content-muted hover:text-danger"
                      >
                        <X className="size-2.5" />
                      </button>
                    </Badge>
                  ))}
                  {selectedCategoriesList.length > 3 && (
                    <Badge variant="secondary" className="text-[10px] py-0.5 font-mono">
                      +{selectedCategoriesList.length - 3} lainnya
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[10px] px-1.5 text-danger hover:text-danger hover:bg-danger/10"
                    onClick={() => {
                      setSelectedPosCategories([])
                      void fetchCatalog({ category_ids: '', page: 1 })
                    }}
                  >
                    Reset
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Tombol Trigger Filter Kategori - Sub Modal Grid 4 Kolom */}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setModalSelectedCats([...selectedPosCategories])
                  setPosCatModalOpen(true)
                }}
                className="h-8.5 text-xs bg-white dark:bg-surface border-gray-200 dark:border-border gap-1.5 px-3 hover:border-primary/50"
              >
                <Folder className="size-3.5 text-primary shrink-0" />
                <span className="truncate max-w-[130px] sm:max-w-[160px] font-medium">
                  {selectedPosCategories.length === 0
                    ? 'Semua Kategori (Filter)'
                    : `${selectedPosCategories.length} Kategori Dipilih`}
                </span>
                {selectedPosCategories.length > 0 ? (
                  <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5 font-mono bg-primary/10 text-primary">
                    {selectedPosCategories.length}
                  </Badge>
                ) : (
                  <Filter className="size-3 text-content-muted shrink-0" />
                )}
              </Button>
            </div>
          </div>

          {/* Product Cards Grid (Vertikal Scrollable) dengan Loading Transparan */}
          <div className="relative flex-1 overflow-y-auto pr-2 min-h-0 custom-scrollbar">
            {isCatalogLoading && (
              <div className="absolute inset-0 bg-white/60 dark:bg-black/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-xl">
                <span className="text-xs font-semibold text-primary animate-pulse bg-surface/90 px-3 py-1.5 rounded-lg border border-border shadow-xs">
                  Memuat katalog produk…
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
              {catalogState.data.map((p) => {
                const isNoPrice = p.price <= 0
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={isNoPrice || !p.unit}
                    onClick={() => !isNoPrice && p.unit && addLine({ id: p.id, name: p.name, sku: p.sku, image_url: p.image_url }, p.unit, p.price, 1)}
                    className={cn(
                      "group relative flex flex-col justify-between rounded-xl border border-gray-200/80 dark:border-border bg-white dark:bg-surface p-2 text-left transition-all duration-200 neu-flat",
                      isNoPrice
                        ? "opacity-60 cursor-not-allowed bg-gray-50/80 dark:bg-surface-alt/40"
                        : "hover:-translate-y-0.5 hover:border-amber-400 dark:hover:border-amber-400 hover:shadow-lg active:scale-95"
                    )}
                  >
                    <div>
                      <div className="relative mb-1.5 aspect-square w-full overflow-hidden rounded-lg bg-gray-50 dark:bg-surface-alt border border-gray-100 dark:border-border">
                        <img
                          src={p.image_url ?? '/images/default-product.webp'}
                          alt={p.name}
                          className="size-full object-contain p-1 transition-transform group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/default-product.webp' }}
                        />
                        {p.has_promo && !isNoPrice && (
                          <Badge className="absolute right-1 top-1 bg-amber-500 px-1.5 py-0 text-[9px] font-bold text-white shadow-sm">PROMO</Badge>
                        )}
                        {isNoPrice && (
                          <Badge className="absolute left-1 top-1 bg-rose-600 px-1.5 py-0 text-[9px] font-bold text-white shadow-sm">Tidak Ada Harga</Badge>
                        )}
                      </div>
                      <p className="line-clamp-2 text-xs font-semibold leading-tight text-gray-900 dark:text-content group-hover:text-amber-500">{p.name}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-gray-100 dark:border-border pt-1.5">
                      {isNoPrice ? (
                        <span className="text-[11px] font-bold text-rose-500">Tidak ada harga</span>
                      ) : (
                        <p className="text-xs font-bold text-amber-500"><Money amount={p.price} size="sm" /></p>
                      )}
                      {isNoPrice ? (
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-surface-alt px-1.5 py-0.5 rounded-md border border-gray-200 cursor-not-allowed">Tidak bisa dipilih</span>
                      ) : (
                        <span className="text-[10px] font-extrabold text-navy-700 dark:text-khaki-200 bg-navy-50 dark:bg-surface-alt px-2 py-0.5 rounded-md border border-navy-200/60 dark:border-border group-hover:border-amber-400 group-hover:bg-amber-400 group-hover:text-black transition-all">+ Tambah</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {catalogState.data.length === 0 && (
              <div className="flex h-48 flex-col items-center justify-center text-gray-400">
                <Search className="mb-2 size-8 opacity-30" />
                <p className="text-sm">Tidak ada produk berstok yang cocok.</p>
              </div>
            )}
          </div>

          {/* Pagination Instant Asynchronous */}
          {catalogState.last_page > 1 && (
            <div className="flex shrink-0 items-center justify-between border-t border-gray-200 dark:border-border pt-2 text-xs text-gray-600 dark:text-content-muted">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs dark:border-border dark:bg-surface dark:text-content hover:dark:bg-surface-alt"
                disabled={catalogState.current_page <= 1 || isCatalogLoading}
                onClick={() => void fetchCatalog({ page: catalogState.current_page - 1 })}
              >
                ◀ Sebelum
              </Button>
              <span className="font-bold dark:text-content">
                Hal. {catalogState.current_page} dari {catalogState.last_page}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs dark:border-border dark:bg-surface dark:text-content hover:dark:bg-surface-alt"
                disabled={catalogState.current_page >= catalogState.last_page || isCatalogLoading}
                onClick={() => void fetchCatalog({ page: catalogState.current_page + 1 })}
              >
                Lanjut ▶
              </Button>
            </div>
          )}
        </section>

        {/* GRID 2: KERANJANG TRANSAKSI (Kolom Tengah ~420px - 480px) */}
        <section className="flex w-[400px] lg:w-[450px] xl:w-[480px] shrink-0 flex-col overflow-hidden border-r border-gray-200 dark:border-border bg-white dark:bg-surface p-3">
          <div className="mb-3 flex items-center justify-between border-b border-gray-200 dark:border-border pb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-navy-800 dark:text-content-muted">Keranjang Transaksi</h2>
              <Badge className="bg-amber-500 text-white font-bold text-xs">{cart.reduce((sum, item) => sum + item.qty, 0)} item</Badge>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-[11px] font-medium text-red-500 hover:text-red-700 hover:underline"
              >
                Kosongkan
              </button>
            )}
          </div>

          {/* Table Keranjang Transaksi */}
          <div className="flex-1 flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-surface neu-flat">
            {/* Table Header */}
            <div className="grid grid-cols-12 items-center gap-1.5 border-b border-gray-200 dark:border-border bg-navy-50/80 dark:bg-surface-alt px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-navy-800 dark:text-content-muted">
              <div className="col-span-3">Produk</div>
              <div className="col-span-3 text-right">Harga</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-3 text-right">Total</div>
              <div className="col-span-1 text-center">#</div>
            </div>

            {/* Table Body Scrollable */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-border">
              {cart.map((line) => (
                <div
                  key={line.key}
                  className="grid grid-cols-12 items-center gap-1.5 px-3 py-2.5 text-xs transition-colors hover:bg-gray-50/80 dark:hover:bg-surface-alt/60"
                >
                  {/* Produk & SKU */}
                  <div className="col-span-3 min-w-0 pr-1">
                    <p className="truncate font-bold text-gray-900 dark:text-content text-xs" title={line.product_name}>
                      {line.product_name}
                    </p>
                    {line.product_sku && (
                      <p className="text-[10px] font-mono text-gray-400 dark:text-content-subtle truncate">
                        {line.product_sku}
                      </p>
                    )}
                  </div>

                  {/* Harga Satuan */}
                  <div className="col-span-3 text-right font-medium text-navy-800 dark:text-content text-xs whitespace-nowrap">
                    <Money amount={line.unit_price} size="sm" />
                  </div>

                  {/* Qty Stepper */}
                  <div className="col-span-2 flex justify-center">
                    <div className="flex items-center gap-1 rounded-lg border border-gray-300 dark:border-border bg-white dark:bg-surface-alt p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => updateQty(line.key, -1)}
                        className="flex size-5 items-center justify-center rounded text-xs font-bold text-gray-700 dark:text-content hover:bg-gray-100 dark:hover:bg-surface active:scale-95"
                      >
                        −
                      </button>
                      <span className="w-4 text-center font-mono text-xs font-bold text-navy-950 dark:text-content">{line.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(line.key, 1)}
                        className="flex size-5 items-center justify-center rounded text-xs font-bold text-gray-700 dark:text-content hover:bg-gray-100 dark:hover:bg-surface active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Subtotal Item */}
                  <div className="col-span-3 text-right font-mono font-bold text-navy-950 dark:text-content text-xs whitespace-nowrap">
                    <Money amount={line.qty * line.unit_price} size="sm" />
                  </div>

                  {/* Tombol Hapus */}
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      className="flex size-6 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Hapus barang"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="flex h-64 flex-col items-center justify-center p-6 text-gray-400">
                  <ShoppingCart className="mb-3 size-10 opacity-30 text-navy-600" />
                  <p className="text-sm font-semibold text-gray-600">Keranjang transaksi kosong</p>
                  <p className="text-xs text-gray-400 text-center mt-1">Scan barcode (F3) atau pilih produk dari katalog.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* GRID 3: RINGKASAN & PAYMENT (Kolom Kanan ~320px) */}
        <aside className="flex w-[300px] lg:w-[320px] shrink-0 flex-col border-l border-gray-200 dark:border-border bg-white dark:bg-surface overflow-hidden">
          {/* Top & Middle Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Pelanggan / Member */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-content-muted">Pelanggan / Member</h3>
                {member && (
                  <button type="button" onClick={() => setMember(null)} className="text-gray-500 dark:text-content-muted hover:text-gray-700 dark:hover:text-content">
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {!member ? (
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => memberInputRef.current?.focus()}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-amber-300/80 dark:border-border py-2 text-xs font-medium text-amber-600 dark:text-amber-400 transition-colors hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-surface-alt"
                  >
                    <ScanLine className="size-4" />
                    Scan kartu member
                  </button>
                  <Input
                    ref={memberInputRef}
                    placeholder="Scan kartu / NIS / cari nama…"
                    value={memberQuery}
                    onChange={(e) => void searchMember(e.target.value)}
                    className={`h-8 rounded-lg text-xs ${posFieldClass}`}
                  />
                  {memberResults.length > 0 ? (
                    <div className="flex flex-col divide-y divide-gray-100 dark:divide-border rounded-xl border border-gray-200 dark:border-border bg-white dark:bg-surface-alt shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                      {memberResults.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => pickMember(m)}
                          className="p-2 text-left text-xs hover:bg-amber-50 dark:hover:bg-surface transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-gray-900 dark:text-content">{m.name}</p>
                            <p className="text-[10px] text-gray-500 dark:text-content-subtle">{m.member_number}</p>
                          </div>
                          <span className="font-mono text-amber-500 font-bold"><Money amount={m.balance_cache} size="sm" /></span>
                        </button>
                      ))}
                    </div>
                  ) : memberQuery.trim() !== '' ? (
                    <div className="rounded-xl border border-dashed border-gray-300 dark:border-border p-2.5 text-center text-xs text-gray-400 dark:text-content-muted bg-gray-50/50 dark:bg-surface-alt/50">
                      Anggota tidak ditemukan
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-border bg-gray-50 dark:bg-surface-alt p-2">
                  <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 dark:bg-surface">
                    <UserCircle className="size-full p-1 text-gray-500 dark:text-content-muted" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-gray-900 dark:text-content">{member.name}</p>
                    <p className="text-[11px] text-gray-500 dark:text-content-muted">Saldo: <span className="font-mono font-medium text-amber-500"><Money amount={member.balance_cache} size="sm" /></span></p>
                    <p className="text-[11px] text-gray-500 dark:text-content-muted">ID Member: {member.member_number}</p>
                    {member.level && <Badge className="mt-1 text-[10px]" variant="outline">{member.level.name}</Badge>}
                  </div>
                </div>
              )}
            </section>

            {/* Kupon & Promo Kasir */}
            <section className="rounded-xl border border-gray-200 dark:border-border bg-gray-50/60 dark:bg-surface-alt/60 p-2.5 space-y-2">
              {/* Header row: label + tombol katalog kecil */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500 dark:text-content-muted flex items-center gap-1">
                  <Ticket className="size-3 text-primary" />
                  Kupon &amp; Promo
                </span>
                <button
                  type="button"
                  onClick={() => setShowPromosModal(true)}
                  className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/8 hover:bg-primary/15 border border-primary/15 px-2 py-0.5 rounded-full transition"
                >
                  <Sparkles className="size-2.5 shrink-0" />
                  Lihat Promo
                  <Badge className="ml-0.5 text-[9px] px-1 py-0 h-3.5 font-bold bg-primary text-white rounded-full border-0">
                    {activePromos.length + activeCoupons.length}
                  </Badge>
                </button>
              </div>

              {/* Input + tombol Terapkan dalam satu baris */}
              <div className="flex items-center gap-1">
                <div className="relative flex-1">
                  <Input
                    placeholder="Kode kupon…"
                    value={appliedCoupon}
                    onChange={(e) => {
                      setAppliedCoupon(e.target.value.toUpperCase())
                      if (couponValidationResult) setCouponValidationResult(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void handleApplyCoupon()
                      }
                    }}
                    className={`h-7 text-[11px] font-mono font-bold uppercase pr-6 ${posFieldClass}`}
                  />
                  {appliedCoupon && (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={!appliedCoupon.trim() || couponValidating}
                  onClick={() => void handleApplyCoupon()}
                  className="h-7 text-[11px] font-semibold px-2.5 shrink-0"
                >
                  {couponValidating ? '…' : 'Terapkan'}
                </Button>
              </div>

              {/* Status kupon setelah validasi */}
              {appliedCoupon && couponValidationResult && (
                <div className={cn(
                  'rounded-lg px-2.5 py-1.5 border text-[11px] flex items-center justify-between gap-2',
                  couponValidationResult.valid
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                )}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    {couponValidationResult.valid
                      ? <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                      : <AlertCircle className="size-3.5 shrink-0 text-rose-500" />}
                    <span className="font-mono font-bold truncate">{appliedCoupon}</span>
                    {couponValidationResult.valid && (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                        − {formatMoney(couponValidationResult.discount)}
                      </span>
                    )}
                    {!couponValidationResult.valid && (
                      <span className="truncate opacity-80 text-[10px]">{couponValidationResult.message}</span>
                    )}
                  </div>
                  <button type="button" onClick={handleRemoveCoupon} className="shrink-0 text-gray-400 hover:text-rose-500">
                    <X className="size-3" />
                  </button>
                </div>
              )}
            </section>

            {/* Ringkasan */}
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-content-muted">Ringkasan</h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600 dark:text-content-muted">
                  <span>Subtotal Belanja</span>
                  <Money amount={subtotal} size="sm" />
                </div>
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400 font-semibold">
                    <span>Diskon Promo</span>
                    <span>− <Money amount={promoDiscount} size="sm" /></span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Potongan Kupon/Voucher</span>
                    <span>− <Money amount={couponDiscount} size="sm" /></span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500 dark:text-content-subtle">
                  <span>Pajak (PPN)</span>
                  <span>Sudah Termasuk</span>
                </div>
                <div className="mt-1.5 border-t border-gray-200 dark:border-border pt-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold text-gray-900 dark:text-content">TOTAL BAYAR</span>
                    <span className="font-mono text-lg font-bold text-amber-500"><Money amount={finalPayable} size="lg" /></span>
                  </div>
                </div>
              </div>
            </section>

            {/* METODE PEMBAYARAN KASIR POS (2 KELOMPOK GRID UTAMA) */}
            <div className="space-y-3">
              {/* ── 1. KELOMPOK GRID PEMBAYARAN MANUAL ── */}
              <section className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                    <Building2 className="size-3.5" />
                    Manual
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(() => {
                    const manualMethods = paymentMethods.filter(
                      (pm) => (pm.is_active ?? true) && ['cash', 'deposit', 'transfer', 'card', 'credit', 'point', 'voucher', 'payroll'].includes(pm.type)
                    )

                    if (manualMethods.length === 0) {
                      return (
                        <div className="col-span-2 rounded-lg border border-blue-200/60 bg-blue-50/40 p-2.5 text-center text-[10px] text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300 font-medium">
                          Tidak ada metode pembayaran manual yang aktif di Pusat Integrasi
                        </div>
                      )
                    }

                    return manualMethods.map((pm) => {
                      const isSelected = activeMethod?.id === pm.id
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setDirectMethodId(pm.id)}
                          className={cn(
                            'relative flex items-center justify-between rounded-lg border p-1.5 px-2.5 text-left transition-all duration-150 active:scale-95 shadow-2xs',
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white shadow-md ring-1 ring-blue-400 scale-[1.01]'
                              : 'border-gray-200 dark:border-border bg-white dark:bg-surface-alt text-gray-800 dark:text-content hover:border-blue-400 dark:hover:border-blue-400',
                          )}
                        >
                          <span className={cn('text-[11px] font-bold leading-tight truncate', isSelected ? 'text-white' : 'text-gray-900 dark:text-content')}>
                            {pm.name}
                          </span>
                          {isSelected && (
                            <div className="flex size-3.5 items-center justify-center rounded-full bg-white text-blue-600 shadow-2xs shrink-0 ml-1">
                              <Check className="size-2.5 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      )
                    })
                  })()}
                </div>
              </section>

              {/* ── 2. KELOMPOK GRID PEMBAYARAN OTOMATIS MIDTRANS ── */}
              <section className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <QrCode className="size-3.5" />
                    Midtrans
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(() => {
                    // Default fallback jika belum ada data setting tersimpan di database
                    const defaultMidtransList = [
                      { code: 'qris', name: 'QRIS Dinamis', category: 'qris' },
                      { code: 'gopay', name: 'GoPay', category: 'ewallet' },
                      { code: 'shopeepay', name: 'ShopeePay', category: 'ewallet' },
                      { code: 'bca_va', name: 'BCA VA', category: 'bank_transfer' },
                      { code: 'bni_va', name: 'BNI VA', category: 'bank_transfer' },
                      { code: 'bri_va', name: 'BRI VA', category: 'bank_transfer' },
                      { code: 'cimb_va', name: 'CIMB VA', category: 'bank_transfer' },
                      { code: 'permata_va', name: 'Permata VA', category: 'bank_transfer' },
                    ]

                    const sourceList = (midtransChannels && midtransChannels.length > 0)
                      ? midtransChannels
                      : defaultMidtransList

                    // Hanya tampilkan channel yang secara eksplisit di-centang oleh admin di menu Integrasi
                    const displayChannels = Array.isArray(savedEnabledChannels)
                      ? sourceList.filter(ch => savedEnabledChannels.includes(ch.code))
                      : sourceList

                    if (displayChannels.length === 0) {
                      return (
                        <div className="col-span-2 rounded-lg border border-amber-200/60 bg-amber-50/40 p-2.5 text-center text-[10px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300 font-medium">
                          Tidak ada channel Midtrans yang di-centang di Pusat Integrasi
                        </div>
                      )
                    }

                    return displayChannels.map((ch) => {
                      const catType = ch.category === 'bank_transfer' ? 'transfer' : ch.category
                      const matchingPm = paymentMethods.find(pm => pm.type === catType || (pm.midtrans_code && pm.midtrans_code === ch.code))
                        ?? paymentMethods.find(pm => pm.type === 'qris')
                        ?? paymentMethods[0]
                      const isSelected = activeMethod?.id === matchingPm?.id

                      return (
                        <button
                          key={ch.code}
                          type="button"
                          onClick={() => matchingPm && setDirectMethodId(matchingPm.id)}
                          className={cn(
                            'relative flex flex-col justify-between rounded-lg border p-1.5 px-2.5 text-left transition-all duration-150 active:scale-95 shadow-2xs',
                            isSelected
                              ? 'border-amber-500 bg-amber-500 text-white shadow-md ring-1 ring-amber-400 scale-[1.01]'
                              : 'border-amber-200/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 text-gray-800 dark:text-content hover:border-amber-400 dark:hover:border-amber-400',
                          )}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={cn('text-[11px] font-extrabold leading-tight truncate', isSelected ? 'text-white' : 'text-navy-950 dark:text-white')}>
                              {ch.name.replace(' Virtual Account', ' VA').replace(' (GoPay, OVO, ShopeePay, Dana, LinkAja)', '')}
                            </span>
                            {isSelected && (
                              <div className="flex size-3.5 items-center justify-center rounded-full bg-white text-amber-600 shadow-2xs shrink-0 ml-1">
                                <Check className="size-2.5 stroke-[3]" />
                              </div>
                            )}
                          </div>
                          <span className={cn('text-[9px] font-mono mt-0.5', isSelected ? 'text-white/80' : 'text-amber-700 dark:text-amber-400')}>
                            Via Midtrans
                          </span>
                        </button>
                      )
                    })
                  })()}
                </div>
              </section>
            </div>

            {/* FITUR KHUSUS CASH / TUNAI: Hitung Kembalian Otomatis */}
            {isCash && (
              <section className="rounded-xl border border-gray-200 dark:border-border bg-gray-50/70 dark:bg-surface-alt/70 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-content-muted">Nominal Uang Bayar</span>
                  <button
                    type="button"
                    onClick={() => setCashInput(finalPayable)}
                    className="text-[11px] font-bold text-amber-500 hover:underline"
                  >
                    Uang Pas
                  </button>
                </div>

                {/* Quick Nominal Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCashInput(finalPayable)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer ${
                      cashInput === finalPayable
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-emerald-500 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/70'
                    }`}
                  >
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>Uang Pas ({formatMoney(finalPayable)})</span>
                  </button>
                  {[10000, 20000, 50000, 100000].map((nominal) => (
                    <button
                      key={nominal}
                      type="button"
                      onClick={() => setCashInput(nominal)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-mono font-semibold transition-all active:scale-95 cursor-pointer ${
                        cashInput === nominal
                          ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
                          : 'border-gray-300 dark:border-border bg-white dark:bg-surface text-gray-800 dark:text-content hover:bg-gray-100 dark:hover:bg-surface-alt'
                      }`}
                    >
                      {(nominal / 1000).toLocaleString('id-ID')}k
                    </button>
                  ))}
                </div>

                {/* Input Nominal Manual dengan Titik Otomatis */}
                <div className="relative">
                  <MoneyInput
                    value={cashInput}
                    onChange={setCashInput}
                    placeholder="Uang diterima (Rp)…"
                    className={`h-9 w-full rounded-lg border border-gray-300 dark:border-border bg-white dark:bg-surface px-3 text-xs font-mono font-bold text-gray-900 dark:text-content placeholder:text-gray-400 dark:placeholder:text-content-muted shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400`}
                  />
                </div>

                {/* Live Kembalian / Kekurangan Preview Box */}
                {cashInput > 0 && (
                  <div>
                    {cashInput >= finalPayable ? (
                      <div className="flex items-center justify-between rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/40 p-2 text-xs text-green-900 dark:text-green-200 font-semibold">
                        <span>Kembalian:</span>
                        <span className="font-mono text-sm font-extrabold text-green-700 dark:text-green-300">
                          Rp {(changeAmount).toLocaleString('id-ID')}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-2 text-xs text-amber-900 dark:text-amber-200 font-semibold">
                        <span>Uang Kurang:</span>
                        <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-300">
                          Rp {(underpaidAmount).toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {holdError && <p className="text-xs text-danger">{holdError}</p>}
            {paymentError && <p className="text-xs text-red-600 font-semibold bg-red-50 dark:bg-red-950/40 p-2 rounded border border-red-200 dark:border-red-800">{paymentError}</p>}
          </div>

          {/* Fixed Bottom Action Footer */}
          <div className="shrink-0 border-t border-gray-200 dark:border-border bg-white dark:bg-surface p-3 space-y-2 shadow-md">
            {/* Tombol Bayar Langsung */}
            <button
              type="button"
              onClick={handleDirectSubmit}
              disabled={cart.length === 0 || submitting || (isCash && cashInput > 0 && cashInput < finalPayable)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-success py-3 text-sm font-bold text-white transition-all duration-150 hover:bg-success/90 disabled:bg-gray-300 disabled:shadow-none shadow-md shadow-emerald-900/30 neu-btn-primary active:scale-95"
            >
              <Wallet className="size-4" />
              {submitting
                ? 'Memproses…'
                : `BAYAR Rp ${(finalPayable).toLocaleString('id-ID')} (F9)`}
            </button>

            {/* Cash Masuk / Cash Keluar */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => openCashDialog('in')}
                className="group flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-surface p-2 text-left transition-colors hover:border-green-300 dark:hover:border-green-500/50 hover:bg-green-50/50 dark:hover:bg-surface-alt"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-emerald-950/60 transition-colors group-hover:bg-green-200 dark:group-hover:bg-emerald-900/60">
                  <ArrowDownCircle className="size-4 text-green-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-green-700 dark:text-emerald-400">Cash Masuk</p>
                  <p className="text-[10px] text-gray-500 dark:text-content-muted">Kas laci</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => openCashDialog('out')}
                className="group flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-surface p-2 text-left transition-colors hover:border-red-300 dark:hover:border-red-500/50 hover:bg-red-50/50 dark:hover:bg-surface-alt"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950/60 transition-colors group-hover:bg-red-200 dark:group-hover:bg-red-900/60">
                  <ArrowUpCircle className="size-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-red-700 dark:text-red-400">Cash Keluar</p>
                  <p className="text-[10px] text-gray-500 dark:text-content-muted">Kas kecil</p>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setHoldsOpen(true)}
              className="w-full rounded-lg border border-gray-300 dark:border-border bg-white dark:bg-surface py-2 text-xs font-bold text-gray-700 dark:text-content hover:bg-gray-50 dark:hover:bg-surface-alt transition-colors"
            >
              Transaksi Ditahan ({holds.length})
            </button>
          </div>
        </aside>
    </div>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="bg-white dark:bg-surface text-gray-900 dark:text-content border border-gray-200 dark:border-border sm:max-w-xl w-[92vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-1">
            <div className="rounded-md border border-gray-200 p-3 text-center">
              <p className="text-xs text-gray-500">Total Tagihan</p>
              <Money amount={subtotal} size="lg" />
            </div>
            {paymentLines.length > 0 && (
              <div className="flex flex-col divide-y divide-gray-200 rounded-md border border-gray-200">
                {paymentLines.map((line) => (
                  <div key={line.key} className="flex flex-col gap-2 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-900">{line.name}</span>
                      <Button type="button" size="icon-sm" variant="ghost" onClick={() => removePaymentLine(line.key)}>
                        <X className="size-3.5" />
                      </Button>
                    </div>
                    {line.type !== 'point' && (
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs text-gray-600">Nominal</Label>
                        <MoneyInput value={line.amount} onChange={(v) => setLineAmount(line, v)} className={posFieldClass} />
                      </div>
                    )}
                    {line.type === 'cash' && (
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs text-gray-600">Uang Diterima</Label>
                        <MoneyInput value={line.received_amount ?? 0} onChange={(v) => updatePaymentLine(line.key, { received_amount: v })} className={posFieldClass} />
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => updatePaymentLine(line.key, { received_amount: line.amount })}
                            className={cn(
                              "inline-flex items-center gap-1.5 font-bold transition-all active:scale-95 cursor-pointer shadow-sm border-2",
                              line.received_amount === line.amount
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                                : "border-emerald-500 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 hover:border-emerald-600"
                            )}
                          >
                            <CheckCircle2 className="size-3.5 shrink-0" />
                            <span>Uang Pas</span>
                          </Button>
                          {[20000, 50000, 100000].map((amt) => (
                            <Button key={amt} type="button" variant="outline" size="sm" onClick={() => updatePaymentLine(line.key, { received_amount: line.amount + amt })}>
                              +{formatMoney(amt)}
                            </Button>
                          ))}
                        </div>
                        <div className="flex flex-col gap-1 pt-1">
                          <Label className="text-xs text-gray-600 font-semibold">PIN Kasir (6-digit)</Label>
                          <PinInput value={line.pin ?? ''} onChange={(v) => updatePaymentLine(line.key, { pin: v })} length={6} />
                        </div>
                      </div>
                    )}
                    {line.type === 'deposit' && member && (
                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs text-gray-500">Saldo anggota: <Money amount={member.balance_cache} size="sm" /></p>
                        <Label className="text-xs text-gray-600 font-semibold">PIN Anggota (6-digit)</Label>
                        <PinInput value={line.pin ?? ''} onChange={(v) => updatePaymentLine(line.key, { pin: v })} length={6} />
                      </div>
                    )}
                    {line.type === 'credit' && member && (
                      <div className="flex flex-col gap-1.5">
                        {creditWarning && <p className="text-xs text-danger">{creditWarning}</p>}
                        <Label className="text-xs text-gray-600 font-semibold">PIN Anggota (6-digit)</Label>
                        <PinInput value={line.pin ?? ''} onChange={(v) => updatePaymentLine(line.key, { pin: v })} length={6} />
                      </div>
                    )}
                    {line.type === 'card' && (
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs text-gray-600">No. Referensi / Approval</Label>
                        <Input
                          value={line.reference_no ?? ''}
                          onChange={(e) => updatePaymentLine(line.key, { reference_no: e.target.value })}
                          placeholder="Wajib diisi (dari mesin EDC)"
                          className={posFieldClass}
                        />
                      </div>
                    )}
                    {(line.type === 'qris' || line.type === 'ewallet' || line.type === 'transfer') && (
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs text-gray-600">No. Referensi</Label>
                        {midtransPayingKey === line.key ? (
                          <p className="text-xs text-gray-500">Menunggu pembayaran di popup Midtrans…</p>
                        ) : line.reference_no ? (
                          <div className="rounded-md border border-success/30 bg-success/10 px-2.5 py-1.5 flex items-center gap-1.5">
                            <CheckCircle2 className="size-3.5 text-success shrink-0" />
                            <span className="text-xs text-success font-medium">Dibayar via Midtrans · {line.reference_no}</span>
                          </div>
                        ) : (
                          <Button type="button" variant="outline" size="sm" onClick={() => void payLineWithMidtrans(line)}>
                            Coba lagi via Midtrans
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {remaining > 0 && (
              <div className="space-y-1.5">
                <Label className="text-gray-600">Tambah Metode Bayar</Label>
                <div className="flex gap-2">
                  <Select value={selectedMethodId} onValueChange={setSelectedMethodId}>
                    <SelectTrigger className={`flex-1 ${posFieldClass}`}>
                      <SelectValue placeholder="Pilih metode" />
                    </SelectTrigger>
                    <SelectContent className={posDropdownClass}>
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

            <div className="flex flex-col gap-1 rounded-md bg-gray-50 p-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span>Total Dibayar</span>
                <Money amount={paidTotal} size="sm" />
              </div>
              <div className="flex justify-between">
                <span>Kurang</span>
                <Money amount={remaining} size="sm" />
              </div>
              {change > 0 && (
                <div className="flex justify-between font-medium text-gray-900">
                  <span>Kembalian</span>
                  <Money amount={change} size="sm" />
                </div>
              )}
            </div>

            {paymentError && <p className="text-sm text-danger">{paymentError}</p>}
          </div>
          <DialogFooter className="bg-gray-50">
            <Button onClick={submitPayment} disabled={submitting || paymentLines.length === 0 || remaining > 0}>Selesaikan Transaksi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={holdsOpen} onOpenChange={setHoldsOpen}>
        <DialogContent className="bg-white dark:bg-surface text-gray-900 dark:text-content border border-gray-200 dark:border-border">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Transaksi Ditahan (Hold)</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col divide-y divide-gray-200">
            {holds.length === 0 && <p className="p-4 text-center text-sm text-gray-500">Tidak ada transaksi ditahan.</p>}
            {holds.map((h) => (
              <button key={h.id} type="button" onClick={() => recallHold(h)} className="flex items-center justify-between p-3 text-left text-sm hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{h.reference}</p>
                  <p className="text-xs text-gray-500">{h.item_count} item · {formatTime(h.held_at)}</p>
                </div>
                <Money amount={h.total} size="sm" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cashDialog !== null} onOpenChange={(open) => !open && setCashDialog(null)}>
        <DialogContent className="bg-white dark:bg-surface text-gray-900 dark:text-content border border-gray-200 dark:border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 font-extrabold text-base flex items-center gap-2">
              {cashDialog === 'in' ? (
                <span>Kas Masuk Laci</span>
              ) : (
                <span>Pengeluaran Kas Laci</span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Mode switch for Kas Keluar */}
          {cashDialog === 'out' && (
            <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-gray-200 bg-gray-100 p-1 text-xs dark:border-border dark:bg-navy-950">
              <button
                type="button"
                onClick={() => setCashOutMode('operational')}
                className={`rounded-lg py-2 font-bold transition-all ${
                  cashOutMode === 'operational'
                    ? 'bg-white text-navy-950 shadow-sm dark:bg-amber-500 dark:text-navy-950'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
                }`}
              >
                Kas Keluar Rutin
              </button>
              <button
                type="button"
                onClick={() => setCashOutMode('member_withdraw')}
                className={`rounded-lg py-2 font-bold transition-all ${
                  cashOutMode === 'member_withdraw'
                    ? 'bg-white text-navy-950 shadow-sm dark:bg-amber-500 dark:text-navy-950'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
                }`}
              >
                Tarik Tunai Deposit
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3 py-1">
            {cashDialog === 'out' && cashOutMode === 'member_withdraw' ? (
              <>
                <div className="rounded-xl border border-amber-500/20 bg-amber-50/60 p-3 dark:bg-amber-950/30 text-xs space-y-1">
                  {withdrawMember ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-extrabold text-slate-900 dark:text-white text-sm">{withdrawMember.name}</p>
                        <p className="text-gray-500 font-mono text-[11px]">No: {withdrawMember.member_number}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 font-semibold block">Saldo Tersedia</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm font-mono">
                          Rp {withdrawMember.balance_cache.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-amber-800 dark:text-amber-300 font-semibold">
                      Scan kartu member atau pilih anggota di POS untuk tarik tunai.
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-gray-600 text-xs font-bold uppercase tracking-wider">Nominal Tarik Tunai</Label>
                  <MoneyInput value={cashAmount} onChange={setCashAmount} className={posFieldClass} />
                  {withdrawMember && cashAmount > withdrawMember.balance_cache && (
                    <p className="mt-1 text-xs font-semibold text-danger">Nominal melebihi saldo deposit anggota!</p>
                  )}
                </div>

                <div>
                  <Label className="text-gray-600 text-xs font-bold uppercase tracking-wider">Catatan / Keterangan (Opsional)</Label>
                  <Input
                    value={cashDescription}
                    onChange={(e) => setCashDescription(e.target.value)}
                    placeholder="Contoh: Tarik tunai uang saku pekanan"
                    className={posFieldClass}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-gray-600 text-xs font-bold uppercase tracking-wider">Nominal Kas</Label>
                  <MoneyInput value={cashAmount} onChange={setCashAmount} className={posFieldClass} />
                </div>
                <div>
                  <Label className="text-gray-600 text-xs font-bold uppercase tracking-wider">Keterangan</Label>
                  <Input
                    value={cashDescription}
                    onChange={(e) => setCashDescription(e.target.value)}
                    placeholder={cashDialog === 'in' ? 'Contoh: Setoran modal awal' : 'Contoh: Beli ATK kasir'}
                    className={posFieldClass}
                  />
                </div>
              </>
            )}

            {cashDialog === 'in' && (
              <div className="flex flex-col items-center justify-center space-y-1.5 text-center pt-1 w-full">
                <Label className="text-xs text-emerald-800 dark:text-emerald-300 font-bold block text-center">
                  PIN Kasir Penerima (Wajib, 6 Digit)
                </Label>
                <PinInput value={cashPin} onChange={setCashPin} length={6} />
              </div>
            )}

            {cashDialog === 'out' && cashOutMode !== 'member_withdraw' && (
              <div className="flex flex-col items-center justify-center space-y-1.5 text-center pt-1 w-full">
                <Label className="text-xs text-gray-700 dark:text-gray-200 font-bold block text-center">
                  PIN Otorisasi Kasir / Supervisor (Wajib, 6 Digit)
                </Label>
                <PinInput value={cashPin} onChange={setCashPin} length={6} />
              </div>
            )}

            {cashDialog === 'out' && cashOutMode === 'member_withdraw' && (
              <div className="space-y-3 pt-1 w-full">
                <div className="flex flex-col items-center justify-center space-y-1.5 text-center w-full">
                  <Label className="text-xs text-navy-950 dark:text-gray-200 font-bold block text-center">
                    1. PIN Kasir Jaga (6 Digit)
                  </Label>
                  <PinInput value={cashPin} onChange={setCashPin} length={6} />
                </div>
                <div className="flex flex-col items-center justify-center space-y-1.5 text-center w-full border-t border-gray-200 dark:border-border pt-2">
                  <Label className="text-xs text-amber-700 dark:text-amber-400 font-bold block text-center">
                    2. PIN Anggota / Santri (6 Digit)
                  </Label>
                  <PinInput value={withdrawMemberPin} onChange={setWithdrawMemberPin} length={6} />
                </div>
              </div>
            )}

            {cashError && <p className="text-xs font-bold text-danger bg-red-50 p-2 rounded-lg">{cashError}</p>}
          </div>

          <DialogFooter className="bg-gray-50 border-t border-gray-100 dark:bg-navy-950 dark:border-border pt-3">
            <Button
              onClick={submitCash}
              disabled={cashSubmitting || (cashDialog === 'out' && cashOutMode === 'member_withdraw' && !withdrawMember)}
              className="bg-navy-900 text-white font-bold hover:bg-navy-950 dark:bg-amber-500 dark:text-navy-950 w-full sm:w-auto"
            >
              {cashSubmitting ? 'Memproses…' : cashDialog === 'out' && cashOutMode === 'member_withdraw' ? 'Proses Tarik Tunai' : 'Simpan Transaksi Kas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Modal Input Metode Pembayaran & Verifikasi PIN */}
      <Dialog open={methodDialog !== null} onOpenChange={(open) => !open && setMethodDialog(null)}>
        <DialogContent className="bg-white dark:bg-surface text-gray-900 dark:text-content border border-gray-200 dark:border-border max-w-md">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-gray-900 dark:text-content font-extrabold text-base text-center">
              {methodDialog?.type === 'cash' && 'Otorisasi PIN Kasir (Pembayaran Tunai)'}
              {methodDialog?.type === 'deposit' && 'Otentikasi PIN Deposit Member'}
              {methodDialog?.type === 'card' && 'Detail Transaksi Mesin EDC (Kartu)'}
              {methodDialog?.type === 'credit' && 'Otentikasi PIN Anggota (Kredit / Tempo)'}
              {methodDialog?.type === 'transfer' && 'Otorisasi & Bukti Transfer Bank Manual'}
            </DialogTitle>
          </DialogHeader>

          {methodDialog?.type === 'cash' && (
            <div className="flex flex-col items-center gap-3 py-1 text-center">
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/30 p-3 text-xs space-y-1.5 w-full text-center">
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span>Total Belanja:</span>
                  <strong className="text-slate-900 dark:text-white font-bold">Rp {finalPayable.toLocaleString('id-ID')}</strong>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span>Uang Diterima:</span>
                  <strong className="text-slate-900 dark:text-white font-bold">Rp {(cashInput > 0 ? cashInput : finalPayable).toLocaleString('id-ID')}</strong>
                </div>
                {cashInput > finalPayable && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold border-t border-blue-200/60 pt-1">
                    <span>Kembalian:</span>
                    <span>Rp {(cashInput - finalPayable).toLocaleString('id-ID')}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center justify-center space-y-1.5 text-center w-full">
                <Label className="text-xs text-gray-700 dark:text-gray-200 font-bold text-center">
                  Masukkan PIN Kasir (6-digit)
                </Label>
                <PinInput value={cashPin} onChange={setCashPin} length={6} />
              </div>
            </div>
          )}

          {methodDialog?.type === 'deposit' && member && (
            <div className="flex flex-col items-center gap-3 py-1 text-center">
              <div className="rounded-xl border border-navy-200 bg-navy-50/60 p-3 text-xs space-y-1 w-full text-center">
                <p className="font-semibold text-navy-900">Anggota: <span className="font-bold">{member.name}</span> ({member.member_number})</p>
                <p className="text-gray-600">Saldo Deposit: <span className="font-bold text-emerald-700">Rp {member.balance_cache.toLocaleString('id-ID')}</span></p>
                <p className="text-gray-600">Total Belanja: <span className="font-bold text-navy-950">Rp {finalPayable.toLocaleString('id-ID')}</span></p>
              </div>
              <div className="flex flex-col items-center justify-center space-y-1.5 text-center w-full">
                <Label className="text-xs text-gray-600 font-semibold text-center">Masukkan PIN Anggota (6-digit)</Label>
                <PinInput value={depositPin} onChange={setDepositPin} length={6} />
              </div>
            </div>
          )}

          {methodDialog?.type === 'card' && (
            <div className="flex flex-col gap-3 py-1">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Pilih Bank Mesin EDC</Label>
                <Select value={edcBank} onValueChange={setEdcBank}>
                  <SelectTrigger className={posFieldClass}>
                    <SelectValue placeholder="Pilih Bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BCA">EDC BCA</SelectItem>
                    <SelectItem value="Mandiri">EDC Mandiri</SelectItem>
                    <SelectItem value="BRI">EDC BRI</SelectItem>
                    <SelectItem value="BNI">EDC BNI</SelectItem>
                    <SelectItem value="Lainnya">Bank Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Nomor Approval / Trace Number (Wajib)</Label>
                <Input
                  value={edcRefNo}
                  onChange={(e) => setEdcRefNo(e.target.value)}
                  placeholder="Contoh: 123456 / 889900"
                  className={posFieldClass}
                  autoFocus
                />
              </div>
            </div>
          )}

          {methodDialog?.type === 'credit' && member && (
            <div className="flex flex-col gap-3 py-1 text-center items-center">
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs space-y-1 w-full text-left">
                <p className="font-semibold text-amber-900">Pembeli: <span className="font-bold">{member.name}</span> ({member.member_number})</p>
                <p className="text-amber-800">Total Piutang: <span className="font-bold">Rp {finalPayable.toLocaleString('id-ID')}</span></p>
                <p className="text-[11px] text-amber-700">Transaksi ini akan dicatat sebagai hutang tempo anggota.</p>
              </div>
              <div className="flex flex-col items-center justify-center space-y-1.5 text-center w-full">
                <Label className="text-xs text-gray-700 dark:text-gray-200 font-bold text-center">
                  Masukkan PIN Anggota (6-digit)
                </Label>
                <PinInput value={creditPin} onChange={setCreditPin} length={6} />
              </div>
            </div>
          )}

          {methodDialog?.type === 'transfer' && (
            <div className="flex flex-col gap-3 py-1">
              {/* Info Bank Sekolah Tujuan Transfer */}
              {bankAccounts && bankAccounts.length > 1 && (
                <div className="space-y-1">
                  <Label className="text-xs text-gray-700 dark:text-gray-200 font-semibold">Pilih Rekening Bank Tujuan Transfer</Label>
                  <Select
                    value={selectedBankRow ? String(selectedBankRow.id) : ''}
                    onValueChange={(v) => setSelectedBankId(Number(v))}
                  >
                    <SelectTrigger className={posFieldClass}>
                      <SelectValue placeholder="Pilih Rekening Bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.bank_name} - {b.account_number} ({b.account_holder})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="rounded-xl border border-blue-200/80 bg-blue-50/60 dark:border-blue-900/60 dark:bg-blue-950/30 p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-blue-200/60 dark:border-blue-900/60 pb-1.5">
                  <span className="text-[11px] font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-blue-600" />
                    Rekening Bank Sekolah Tujuan
                  </span>
                  <Badge variant="outline" className="text-[9px] bg-blue-100 text-blue-800 border-blue-300 font-extrabold">
                    Manual Toko
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Bank Tujuan</span>
                    <strong className="text-slate-900 dark:text-white font-bold">{selectedBankRow?.bank_name ?? 'BSI (Bank Syariah Indonesia)'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Nomor Rekening</span>
                    <strong className="text-blue-700 dark:text-blue-300 font-mono font-bold">{selectedBankRow?.account_number ?? '7123456789'}</strong>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-blue-200/40">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Atas Nama Rekening</span>
                    <strong className="text-slate-900 dark:text-white font-bold">{selectedBankRow?.account_holder ?? 'SMK Skill Village Islamic School'}</strong>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 pt-1.5 border-t border-blue-200/60 font-semibold flex items-center justify-between">
                  <span>Total Tagihan:</span>
                  <strong className="text-slate-900 dark:text-white font-mono text-sm font-black">Rp {finalPayable.toLocaleString('id-ID')}</strong>
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-gray-700 dark:text-gray-200 font-semibold">No. Referensi Bank / Nama Pengirim Transfer (Wajib)</Label>
                <Input
                  value={transferRefNo}
                  onChange={(e) => setTransferRefNo(e.target.value)}
                  placeholder="Contoh: TRF-BCA-987654 / Budi Santoso"
                  className={posFieldClass}
                  autoFocus
                />
              </div>

              <div className="flex flex-col items-center justify-center space-y-1.5 text-center pt-1 w-full">
                <Label className="text-xs text-gray-700 dark:text-gray-200 font-bold block text-center">PIN Otorisasi Kasir / Supervisor (Wajib, 6 Digit)</Label>
                <PinInput value={transferPin} onChange={setTransferPin} length={6} />
              </div>
            </div>
          )}

          {methodDialogError && (
            <p className="text-xs text-red-600 font-semibold bg-red-50 p-2 rounded border border-red-200 text-center">{methodDialogError}</p>
          )}

          <DialogFooter className="bg-gray-50 flex justify-center sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setMethodDialog(null)}>Batal</Button>
            <Button
              disabled={submitting}
              onClick={() => {
                if (methodDialog?.type === 'cash') {
                  if (cashPin.length < 6) {
                    setMethodDialogError('PIN kasir harus 6 digit angka.')
                    return
                  }
                  executeSaleStore({ pin: cashPin.trim() })
                } else if (methodDialog?.type === 'deposit') {
                  if (depositPin.length < 6) {
                    setMethodDialogError('PIN anggota harus 6 digit angka.')
                    return
                  }
                  executeSaleStore({ pin: depositPin.trim() })
                } else if (methodDialog?.type === 'card') {
                  if (!edcRefNo.trim()) {
                    setMethodDialogError('Nomor referensi / approval EDC wajib diisi.')
                    return
                  }
                  executeSaleStore({ reference_no: `${edcBank}-${edcRefNo.trim()}` })
                } else if (methodDialog?.type === 'credit') {
                  if (creditPin.length < 6) {
                    setMethodDialogError('PIN anggota harus 6 digit angka.')
                    return
                  }
                  executeSaleStore({ pin: creditPin.trim() })
                } else if (methodDialog?.type === 'transfer') {
                  if (!transferRefNo.trim()) {
                    setMethodDialogError('Nomor referensi / pengirim transfer wajib diisi.')
                    return
                  }
                  if (!transferPin.trim() || transferPin.length < 6) {
                    setMethodDialogError('PIN otorisasi 6 digit wajib diisi.')
                    return
                  }
                  executeSaleStore({ reference_no: transferRefNo.trim(), pin: transferPin.trim() })
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white"
            >
              {submitting ? 'Memproses…' : 'Konfirmasi & Bayar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Peringatan Penolakan Kas Keluar (Cash on Hand Kurang) */}
      <Dialog open={insufficientCashModal !== null} onOpenChange={(open) => !open && setInsufficientCashModal(null)}>
        <DialogContent className="bg-white dark:bg-surface text-gray-900 dark:text-content border border-red-200 dark:border-red-900/50 max-w-md text-center p-6 rounded-2xl shadow-xl">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 shadow-md">
            <AlertCircle className="size-8 stroke-[2.5]" />
          </div>
          <div className="mt-3 space-y-2">
            <h3 className="text-lg font-extrabold text-red-600 dark:text-red-400">
              {insufficientCashModal?.title ?? 'Transaksi Kas Keluar Ditolak!'}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              {insufficientCashModal?.message}
            </p>

            <div className="rounded-xl border border-red-200 bg-red-50/70 dark:border-red-900/40 dark:bg-red-950/30 p-3 text-xs space-y-1.5 text-left mt-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Nominal Diajukan:</span>
                <strong className="text-gray-900 dark:text-white font-bold">
                  Rp {(insufficientCashModal?.requestedAmount ?? 0).toLocaleString('id-ID')}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Cash On Hand (Laci):</span>
                <strong className="text-emerald-700 dark:text-emerald-400 font-bold">
                  Rp {(insufficientCashModal?.currentBalance ?? 0).toLocaleString('id-ID')}
                </strong>
              </div>
              <div className="flex justify-between border-t border-red-200/60 pt-1 text-red-700 dark:text-red-400 font-bold">
                <span>Selisih Kekurangan:</span>
                <span>Rp {(insufficientCashModal?.shortage ?? 0).toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 sm:justify-center">
            <Button
              onClick={() => setInsufficientCashModal(null)}
              className="bg-navy-900 text-white font-bold hover:bg-navy-950 dark:bg-amber-500 dark:text-navy-950 w-full"
            >
              Paham &amp; Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* ── Modal Dialog Popup Estetik: Saldo Deposit Tidak Mencukupi ── */}
      <Dialog open={insufficientDepositModal !== null} onOpenChange={(open) => !open && setInsufficientDepositModal(null)}>
        <DialogContent className="bg-white dark:bg-surface text-gray-900 dark:text-content border border-gray-200 dark:border-border max-w-md rounded-2xl p-6 shadow-2xl border border-rose-200">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 shadow-sm shrink-0">
              <AlertCircle className="size-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-gray-900">Saldo Deposit Kurang</h3>
              <p className="text-xs text-rose-600 font-medium">Pembayaran deposit santri ditolak sistem</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-gray-50 border border-gray-200/80 p-3.5 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Anggota / Santri:</span>
                <span className="font-bold text-gray-900">{insufficientDepositModal?.memberName} <span className="font-mono text-[11px] text-gray-400">({insufficientDepositModal?.memberNumber})</span></span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-gray-200/60 pt-2">
                <span className="text-gray-500">Saldo Deposit Saat Ini:</span>
                <span className="font-bold text-emerald-600">Rp {(insufficientDepositModal?.currentBalance || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-gray-200/60 pt-2">
                <span className="text-gray-500">Total Tagihan Belanja:</span>
                <span className="font-bold text-navy-950">Rp {(insufficientDepositModal?.requiredAmount || 0).toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-rose-50 border border-rose-200/80 p-3.5 text-rose-900">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Kekurangan Saldo</span>
              <span className="text-lg font-black text-rose-600">Rp {(insufficientDepositModal?.shortage || 0).toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <Button
              onClick={() => {
                setInsufficientDepositModal(null)
                toast.info('Silakan pilih metode pembayaran lain (Tunai / QRIS).')
              }}
              className="bg-navy-900 hover:bg-navy-800 text-white font-bold w-full rounded-xl py-2.5 shadow-sm"
            >
              Ganti Metode Pembayaran (Tunai / QRIS)
            </Button>
            <Button
              variant="outline"
              onClick={() => setInsufficientDepositModal(null)}
              className="border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold w-full rounded-xl"
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Pakasir In-Page Payment Gateway Modal ── */}
      <Dialog open={pakasirModalUrl !== null} onOpenChange={(open) => !open && setPakasirModalUrl(null)}>
        <DialogContent className="bg-white dark:bg-surface text-gray-900 dark:text-content border border-gray-200 dark:border-border sm:max-w-2xl w-[92vw] max-h-[92vh] rounded-2xl p-5 sm:p-6 shadow-2xl border border-mustard-200 overflow-y-auto">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-mustard-100 text-mustard-700 font-bold shrink-0">
                <QrCode className="size-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-navy-950">Pembayaran Pakasir PG</h3>
                <p className="text-xs text-gray-500">Scan QRIS / Selesaikan Pembayaran Online</p>
              </div>
            </div>
            <Badge className="bg-emerald-600 text-white font-bold text-xs px-2.5 py-1">Realtime Callback</Badge>
          </div>

          <div className="mt-3 flex flex-col items-center gap-3">
            <div className="w-full h-[540px] sm:h-[580px] rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shadow-inner">
              <iframe
                src={pakasirModalUrl || ''}
                className="w-full h-full border-0"
                title="Pakasir Payment Gateway"
              />
            </div>

            <div className="flex items-center justify-between w-full text-xs font-mono bg-navy-50 p-2.5 rounded-xl border border-navy-100">
              <span className="text-navy-700">Order ID: <strong>{pakasirModalOrderId}</strong></span>
              <span className="text-emerald-700 font-bold">Total: Rp {(pakasirModalAmount || 0).toLocaleString('id-ID')}</span>
            </div>

            <div className="flex gap-2 w-full">
              <Button
                onClick={() => {
                  setPakasirModalUrl(null)
                  toast.success('Melanjutkan transaksi kasir...')
                  // Selesaikan transaksi kasir secara otomatis
                  router.post(
                    route('pos.sales.store'),
                    {
                      outlet_id: outlet?.id,
                      cashier_session_id: session.id,
                      member_id: member?.id ?? null,
                      items: cart.map((l) => ({ product_id: l.product_id, unit_id: l.unit_id, qty: l.qty, unit_price: l.unit_price, product_name: l.product_name, unit_code: l.unit_code })),
                      payments: [
                        {
                          payment_method_id: activeMethod?.id || 1,
                          amount: subtotal,
                          received_amount: subtotal,
                          reference_no: pakasirModalOrderId || `PAKASIR-${Date.now()}`,
                          gateway_status: 'settlement',
                        },
                      ],
                    },
                    {
                      headers: { 'X-Idempotency-Key': idempotencyKeyRef.current },
                      onSuccess: (page) => {
                        const flash = page.props.flash as any
                        const saleId = flash?.completed_sale_id
                        const saleRef = flash?.completed_sale_ref

                        toast.success('Pembayaran Pakasir PG Berhasil!', {
                          description: 'Transaksi kasir telah sukses dicatat ke sistem.',
                        })

                        setTxResultModal({
                          open: true,
                          type: 'success',
                          title: 'Pembayaran Pakasir PG Berhasil!',
                          message: `Pembayaran online QRIS / e-wallet senilai Rp ${subtotal.toLocaleString('id-ID')} sukses diverifikasi.`,
                          saleId: saleId ?? null,
                          saleRef: saleRef ?? null,
                          amount: subtotal,
                          methodName: 'Pakasir PG (QRIS)',
                        })

                        setCart([])
                        setMember(null)
                        setCashInput(0)
                        setPaymentError(null)
                        idempotencyKeyRef.current = newIdempotencyKey()
                      },
                      onError: (errors) => {
                        const msg = Object.values(errors)[0] ?? 'Gagal menyelesaikan transaksi.'
                        setPaymentError(msg)
                        toast.error(`Transaksi Pakasir Gagal: ${msg}`)

                        setTxResultModal({
                          open: true,
                          type: 'error',
                          title: 'Transaksi Pakasir Gagal',
                          message: msg,
                        })
                      },
                    }
                  )
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-bold text-white rounded-xl py-2.5"
              >
                <CheckCircle2 className="mr-2 size-4" /> Selesaikan Transaksi
              </Button>
              <Button
                variant="outline"
                onClick={() => setPakasirModalUrl(null)}
                className="rounded-xl border-gray-300 text-gray-700"
              >
                Tutup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Center Aesthetic Transaction Result Modal (Success & Failure) ── */}
      {(() => {
        const targetSaleId = txResultModal?.saleId || lastSaleId || pageProps.flash?.completed_sale_id || null
        const targetSaleRef = txResultModal?.saleRef || pageProps.flash?.completed_sale_ref || null

        return (
          <Dialog open={txResultModal?.open ?? false} onOpenChange={(open) => !open && setTxResultModal(null)}>
            <DialogContent className="sm:max-w-md w-[94vw] max-h-[90vh] overflow-y-auto text-center p-5 sm:p-6 rounded-3xl backdrop-blur-md shadow-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <DialogHeader className="sr-only">
                <DialogTitle>{txResultModal?.title ?? 'Hasil Transaksi'}</DialogTitle>
              </DialogHeader>

              {/* Ambient Glow Effects */}
              <div className={cn(
                "absolute -top-16 -left-16 size-40 rounded-full blur-3xl pointer-events-none",
                txResultModal?.type === 'success' ? "bg-emerald-500/15" : "bg-rose-500/15"
              )} />
              <div className={cn(
                "absolute -bottom-16 -right-16 size-40 rounded-full blur-3xl pointer-events-none",
                txResultModal?.type === 'success' ? "bg-amber-500/15" : "bg-rose-500/15"
              )} />

              <div className="relative flex flex-col items-center">
                {/* Top Animated Icon */}
                {txResultModal?.type === 'success' ? (
                  <div className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-xs">
                    <CheckCircle2 className="size-8 stroke-[2.5]" />
                  </div>
                ) : (
                  <div className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 shadow-xs">
                    <AlertCircle className="size-8 stroke-[2.5]" />
                  </div>
                )}

                {/* Status Pill */}
                <div className={cn(
                  "mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider",
                  txResultModal?.type === 'success'
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                )}>
                  <span className={cn("size-2 rounded-full", txResultModal?.type === 'success' ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                  {txResultModal?.type === 'success' ? 'Transaksi Lunas' : 'Gagal Simpan'}
                </div>

                {/* Title */}
                <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-xl">
                  {txResultModal?.title}
                </h3>
                <p className="mb-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
                  {txResultModal?.message}
                </p>

                {/* Details Card */}
                {txResultModal?.type === 'success' && (
                  <div className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-800/80 p-3 text-left space-y-2 text-xs">
                    {targetSaleRef && (
                      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/80 pb-1.5">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">No. Nota:</span>
                        <span className="font-mono font-black text-slate-900 dark:text-white bg-amber-500/15 px-2 py-0.5 rounded text-amber-700 dark:text-amber-300 text-xs">
                          {targetSaleRef}
                        </span>
                      </div>
                    )}
                    {txResultModal.methodName && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Metode Pembayaran:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{txResultModal.methodName}</span>
                      </div>
                    )}
                    {txResultModal.amount !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Total Belanja:</span>
                        <strong className="font-black text-slate-900 dark:text-white">Rp {txResultModal.amount.toLocaleString('id-ID')}</strong>
                      </div>
                    )}
                    {txResultModal.changeAmount !== undefined && txResultModal.changeAmount > 0 && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 dark:border-slate-700/80">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">Uang Kembalian:</span>
                        <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm">Rp {txResultModal.changeAmount.toLocaleString('id-ID')}</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                {txResultModal?.type === 'success' ? (
                  <div className="flex flex-col gap-2 w-full">
                    {targetSaleId ? (
                      <div className="grid grid-cols-3 gap-2 w-full">
                        {/* 1. Direct Receipt PDF Print */}
                        <Button
                          type="button"
                          onClick={() => {
                            if (targetSaleId) {
                              window.open(route('pos.sales.receipt-pdf', targetSaleId), '_blank')
                            }
                          }}
                          className="gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 shadow-sm cursor-pointer"
                        >
                          <Printer className="size-3.5 shrink-0" />
                          Cetak Struk
                        </Button>

                        {/* 2. PDF Nota in New Tab */}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (targetSaleId) {
                              window.open(route('pos.sales.receipt-pdf', targetSaleId), '_blank')
                            }
                          }}
                          className="gap-1 rounded-xl border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <FileText className="size-3.5 shrink-0" />
                          Nota PDF
                        </Button>

                        {/* 3. View Full Receipt Page */}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (targetSaleId) {
                              router.visit(route('pos.sales.receipt', targetSaleId))
                            }
                          }}
                          className="gap-1 rounded-xl border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Receipt className="size-3.5 shrink-0" />
                          Lihat Nota
                        </Button>
                      </div>
                    ) : null}

                    <Button
                      type="button"
                      onClick={() => {
                        setTxResultModal(null)
                        focusScan()
                      }}
                      className="w-full gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 shadow-md text-sm cursor-pointer"
                    >
                      <PlusCircle className="size-4" />
                      Transaksi Baru (Esc)
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setTxResultModal(null)}
                    className="w-full gap-2 rounded-xl bg-slate-900 hover:bg-slate-950 text-white font-bold py-3 shadow-md text-sm"
                  >
                    Tutup &amp; Coba Lagi
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}

      {/* Dialog Katalog Promo & Kupon Hari Ini — 2 Tab */}
      <Dialog open={showPromosModal} onOpenChange={(open) => {
        setShowPromosModal(open)
        if (!open) setPromoTypeFilter('all')
      }}>
        <DialogContent className="max-h-[90vh] w-[95vw] sm:max-w-2xl md:max-w-3xl overflow-hidden flex flex-col p-0 rounded-2xl border-border bg-card shadow-2xl">

          {/* Header */}
          <DialogHeader className="px-5 pt-5 pb-0 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Sparkles className="size-4.5 text-primary" />
              Katalog Promo &amp; Kupon Hari Ini
            </DialogTitle>

            {/* 2-Tab Switcher */}
            <div className="mt-3 flex gap-0 rounded-xl bg-muted p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPromoModalTab('promos')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all',
                  promoModalTab === 'promos'
                    ? 'bg-white dark:bg-surface shadow text-primary font-bold'
                    : 'text-content-muted hover:text-content'
                )}
              >
                <Zap className="size-3.5" />
                ✨ Promo Otomatis Toko
                <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                  {activePromos.length}
                </Badge>
              </button>
              <button
                type="button"
                onClick={() => setPromoModalTab('coupons')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all',
                  promoModalTab === 'coupons'
                    ? 'bg-white dark:bg-surface shadow text-primary font-bold'
                    : 'text-content-muted hover:text-content'
                )}
              >
                <Ticket className="size-3.5" />
                🎟️ Kupon &amp; Voucher
                <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                  {activeCoupons.length}
                </Badge>
              </button>
            </div>
          </DialogHeader>

          {/* ── TAB 1: PROMO OTOMATIS ── */}
          {promoModalTab === 'promos' && (
            <div className="flex-1 overflow-y-auto px-5 pb-5 pt-3 space-y-3">
              {/* Penjelasan */}
              <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 text-xs text-content-muted flex items-start gap-2">
                <Info className="size-3.5 shrink-0 text-primary mt-0.5" />
                <p>Promo berikut <strong>dihitung otomatis</strong> oleh sistem kasir saat barang dimasukkan ke keranjang. Kasir tidak perlu menginput kode apapun.</p>
              </div>

              {/* Filter Type Pills */}
              {activePromos.length > 0 && (() => {
                const promoTypeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
                  all:          { label: 'Semua', icon: <Layers className="size-3" /> },
                  product:      { label: 'Diskon Barang', icon: <Percent className="size-3" /> },
                  category:     { label: 'Kategori', icon: <Folder className="size-3" /> },
                  bundle:       { label: 'Paket Bundel', icon: <Gift className="size-3" /> },
                  buy_x_get_y:  { label: 'Beli X Gratis Y', icon: <Sparkles className="size-3" /> },
                  tiered_qty:   { label: 'Grosir / Semakin Banyak', icon: <Layers className="size-3" /> },
                  happy_hour:   { label: 'Flash Sale / Happy Hour', icon: <Zap className="size-3" /> },
                  clearance:    { label: 'Cuci Gudang', icon: <Flame className="size-3" /> },
                  member_level: { label: 'Level Member', icon: <UserCircle className="size-3" /> },
                  birthday:     { label: 'Birthday Promo', icon: <Gift className="size-3" /> },
                }
                const types = Array.from(new Set(activePromos.map((p) => p.type)))
                return (
                  <div className="flex gap-1.5 flex-wrap">
                    {(['all', ...types] as string[]).map((t) => {
                      const meta = promoTypeLabels[t] ?? { label: t, icon: <Tag className="size-3" /> }
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setPromoTypeFilter(t)}
                          className={cn(
                            'flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition',
                            promoTypeFilter === t
                              ? 'bg-primary text-white border-primary shadow-sm'
                              : 'bg-muted/60 text-content-muted border-border hover:bg-muted hover:text-content'
                          )}
                        >
                          {meta.icon}
                          {meta.label}
                        </button>
                      )
                    })}
                  </div>
                )
              })()}

              {/* Promo Cards */}
              {activePromos.length === 0 ? (
                <div className="py-10 text-center text-xs text-content-muted">
                  Tidak ada promo toko yang aktif hari ini.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activePromos
                    .filter((p) => promoTypeFilter === 'all' || p.type === promoTypeFilter)
                    .map((p) => {
                      const typeIcons: Record<string, React.ReactNode> = {
                        product: <Percent className="size-3.5 text-primary" />,
                        category: <Folder className="size-3.5 text-sky-500" />,
                        bundle: <Gift className="size-3.5 text-violet-500" />,
                        buy_x_get_y: <Sparkles className="size-3.5 text-amber-500" />,
                        tiered_qty: <Layers className="size-3.5 text-teal-500" />,
                        happy_hour: <Zap className="size-3.5 text-rose-500" />,
                        clearance: <Flame className="size-3.5 text-orange-500" />,
                        member_level: <UserCircle className="size-3.5 text-indigo-500" />,
                        birthday: <Gift className="size-3.5 text-pink-500" />,
                      }
                      const discountText =
                        p.discount_type === 'percent'
                          ? `${p.discount_value}%`
                          : p.discount_type === 'amount'
                          ? formatMoney(p.discount_value)
                          : p.discount_type === 'fixed_price'
                          ? `Harga Pas ${formatMoney(p.discount_value)}`
                          : 'Gratis'

                      return (
                        <div
                          key={p.id}
                          className="p-3 rounded-xl border border-border bg-background hover:border-primary/40 hover:shadow-sm transition flex flex-col gap-2 shadow-xs"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {typeIcons[p.type] ?? <Tag className="size-3.5 text-content-muted shrink-0" />}
                              <span className="font-bold text-xs text-content truncate">{p.name}</span>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-mono shrink-0 bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                              {p.code}
                            </Badge>
                          </div>

                          {p.description && (
                            <p className="text-[11px] text-content-muted leading-relaxed">{p.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Hemat {discountText}</span>
                            {p.min_purchase ? <span className="text-content-subtle">• Min. {formatMoney(p.min_purchase)}</span> : null}
                            {p.buy_qty && p.get_qty ? <span className="text-content-subtle">• Beli {p.buy_qty} Gratis {p.get_qty}</span> : null}
                            {p.start_time && p.end_time ? (
                              <span className="flex items-center gap-0.5 text-content-subtle">
                                <Clock className="size-3" /> {p.start_time}–{p.end_time}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-auto">
                            <Badge className="text-[10px] w-full justify-center py-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 rounded-lg font-semibold">
                              <CheckCircle2 className="size-3 mr-1" />
                              ✓ Otomatis Dihitung di Keranjang
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: KUPON & VOUCHER ── */}
          {promoModalTab === 'coupons' && (
            <div className="flex-1 overflow-y-auto px-5 pb-5 pt-3 space-y-3">
              {/* Penjelasan */}
              <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 text-xs text-content-muted flex items-start gap-2">
                <Ticket className="size-3.5 shrink-0 text-primary mt-0.5" />
                <p>Kupon &amp; voucher harus <strong>diinput manual oleh kasir</strong>. Klik <em>"Pakai Kupon Ini"</em> atau salin kode ke kolom kupon di sidebar.</p>
              </div>

              {activeCoupons.length === 0 ? (
                <div className="py-10 text-center text-xs text-content-muted">
                  Tidak ada kupon atau voucher aktif saat ini.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {activeCoupons.map((c) => {
                    const isApplied = appliedCoupon === c.code
                    const discountText =
                      c.discount_type === 'percent'
                        ? `${c.discount_value}%`
                        : formatMoney(c.discount_value)

                    return (
                      <div
                        key={c.id}
                        className={cn(
                          'rounded-xl border p-3 flex items-center gap-3 shadow-xs transition',
                          isApplied
                            ? 'border-emerald-500/40 bg-emerald-500/5'
                            : 'border-border bg-background hover:border-primary/30'
                        )}
                      >
                        {/* Ticket Icon */}
                        <div className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-xl',
                          c.source === 'voucher' ? 'bg-violet-100 dark:bg-violet-950' : 'bg-primary/10'
                        )}>
                          {c.source === 'voucher'
                            ? <Gift className="size-5 text-violet-600 dark:text-violet-400" />
                            : <Ticket className="size-5 text-primary" />}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-content">{c.name}</span>
                            <Badge variant="outline" className="text-[10px] font-mono bg-muted/60 text-content-muted border-border">
                              {c.code}
                            </Badge>
                            {c.source === 'voucher' && (
                              <Badge className="text-[10px] bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30">
                                Voucher
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            Diskon {discountText}
                            {c.max_discount ? ` (maks. ${formatMoney(c.max_discount)})` : ''}
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-content-subtle">
                            {c.min_purchase ? <span>Min. belanja {formatMoney(c.min_purchase)}</span> : null}
                            {c.valid_until && <span>Berlaku s/d {c.valid_until}</span>}
                            {c.quota > 0 && (
                              <span>Sisa: {c.quota - c.used_count}/{c.quota}</span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            disabled={isApplied}
                            onClick={() => handleSelectCouponFromModal(c.code)}
                            className={cn(
                              'h-7 text-[11px] px-3 font-bold',
                              isApplied
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                : ''
                            )}
                          >
                            {isApplied ? (
                              <><CheckCircle2 className="size-3 mr-1" /> Terpakai</>
                            ) : (
                              'Pakai Kupon Ini'
                            )}
                          </Button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(c.code).then(() => {
                                toast.success(`Kode ${c.code} disalin!`)
                              })
                            }}
                            className="flex items-center justify-center gap-1 text-[10px] text-content-muted hover:text-content transition"
                          >
                            <Copy className="size-3" /> Salin Kode
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="px-5 py-3 border-t border-border bg-muted/10 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowPromosModal(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-Dialog Kategori POS (Grid 4 Kolom Rapi dengan Multi-Select Checkbox & Tinggi Optimal) */}
      <Dialog open={posCatModalOpen} onOpenChange={setPosCatModalOpen}>
        <DialogContent className="flex flex-col h-[92vh] max-h-[92vh] w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl overflow-hidden p-0 rounded-2xl shadow-2xl border-border bg-card">
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Folder className="size-5 text-primary" />
                Pilih Filter Kategori Produk Kasir
              </DialogTitle>
              <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 bg-primary/10 text-primary border-primary/30">
                {modalSelectedCats.length === 0 ? 'Semua Kategori' : `${modalSelectedCats.length} Terpilih`}
              </Badge>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4 flex-1 overflow-hidden min-h-0 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
                <Input
                  placeholder="Cari nama kategori…"
                  value={posCatModalSearch}
                  onChange={(e) => setPosCatModalSearch(e.target.value)}
                  className="pl-9.5 text-xs bg-background h-9.5 w-full"
                />
                {posCatModalSearch && (
                  <button
                    type="button"
                    onClick={() => setPosCatModalSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 text-xs gap-1.5 px-3 hover:border-primary/50"
                  onClick={() => setModalSelectedCats(categories.map((c) => c.id))}
                >
                  <CheckSquare className="size-3.5 text-primary" /> Pilih Semua ({categories.length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-9 text-xs text-danger hover:text-danger hover:bg-danger/10 gap-1.5 px-3"
                  onClick={() => setModalSelectedCats([])}
                >
                  <RotateCcw className="size-3.5" /> Reset (Semua)
                </Button>
              </div>
            </div>

            {/* Grid 4 Kolom Kategori dengan Checkbox (Mengisi Seluruh Sisa Tinggi Modal) */}
            <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-1 custom-scrollbar">
              {filteredModalCategories.length === 0 ? (
                <div className="col-span-full py-16 text-center text-xs text-content-muted">
                  Tidak ada kategori yang cocok dengan pencarian "{posCatModalSearch}".
                </div>
              ) : (
                filteredModalCategories.map((cat) => {
                  const isChecked = modalSelectedCats.includes(cat.id)
                  return (
                    <div
                      key={cat.id}
                      onClick={() =>
                        setModalSelectedCats((prev) =>
                          isChecked ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                        )
                      }
                      className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border cursor-pointer transition select-none ${
                        isChecked
                          ? 'border-primary bg-primary/10 shadow-xs ring-2 ring-primary/40 font-bold'
                          : 'border-border/80 bg-card hover:bg-muted/40 hover:border-border font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            // Handled by parent div onClick
                          }}
                          className="size-4 shrink-0 pointer-events-none"
                        />
                        <span className="text-xs text-content truncate">{cat.name}</span>
                      </div>
                      {isChecked && <CheckCircle2 className="size-4 text-primary shrink-0" />}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-2 shrink-0">
            <span className="text-xs text-content-muted font-medium">
              {modalSelectedCats.length === 0
                ? 'Semua kategori aktif (tanpa batasan filter)'
                : `${modalSelectedCats.length} dari ${categories.length} kategori dipilih`}
            </span>
            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPosCatModalOpen(false)}
                className="text-xs px-5 h-9"
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setSelectedPosCategories([...modalSelectedCats])
                  void fetchCatalog({ category_ids: modalSelectedCats.join(','), page: 1 })
                  setPosCatModalOpen(false)
                }}
                className="font-semibold text-xs px-6 h-9"
              >
                Terapkan Filter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PosLayout>
  )
}
