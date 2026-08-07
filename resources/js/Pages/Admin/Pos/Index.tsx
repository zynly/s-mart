import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { router, usePage } from '@inertiajs/react'
import { useHotkeys } from 'react-hotkeys-hook'
import {
  ArrowDownCircle, ArrowUpCircle, Check, CheckCircle2, ChevronLeft, ChevronRight, CreditCard, Lock, Pause, Phone, PlusCircle, Printer,
  ScanLine, Search, ShoppingCart, Store, Trash2, UserCircle, Wallet, X,
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
const posFieldClass = 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 dark:bg-white dark:text-gray-900'
// SelectContent/SelectItem (popover dropdown Radix, bukan trigger-nya)
// pakai token `bg-popover`/`text-popover-foreground` yang sama-sama
// ikut resolve gelap di bawah `dark` yang dipaksa PosLayout — tanpa
// override ini dropdown-nya gelap padahal trigger di sekitarnya sudah
// terang, kontrasnya pecah (item terlihat "disabled").
const posDropdownClass = 'bg-white text-gray-900 [&_[data-slot=select-item]]:text-gray-900 [&_[data-slot=select-item]:focus]:bg-gray-100'

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
  gateway_status?: 'settlement' | 'capture' | 'pending'
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
  midtransClientKey: string | null
  midtransIsProduction: boolean
}

export default function Index({ session, outlet, paymentMethods, catalog, categories, holds, noPinThreshold, pointValue, midtransClientKey, midtransIsProduction }: PosIndexProps) {
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
  const pageProps = usePage<PageProps & { flash?: { completed_sale_id?: number; completed_sale_ref?: string } }>().props
  const [completedSale, setCompletedSale] = useState<{ id: number; ref: string } | null>(null)

  useEffect(() => {
    if (pageProps.flash?.completed_sale_id && pageProps.flash?.completed_sale_ref) {
      setCompletedSale({ id: pageProps.flash.completed_sale_id, ref: pageProps.flash.completed_sale_ref })
    }
  }, [pageProps.flash?.completed_sale_id, pageProps.flash?.completed_sale_ref])

  const idempotencyKeyRef = useRef(newIdempotencyKey())
  const barcodeRef = useRef<HTMLInputElement>(null)
  const memberInputRef = useRef<HTMLInputElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  function scrollCarousel(direction: -1 | 1) {
    carouselRef.current?.scrollBy({ left: direction * 320, behavior: 'smooth' })
  }

  const subtotal = useMemo(() => cart.reduce((sum, line) => sum + line.qty * line.unit_price, 0), [cart])

  const activeMethod = useMemo(() => {
    if (directMethodId) {
      const found = paymentMethods.find((pm) => pm.id === directMethodId)
      if (found) return found
    }
    return paymentMethods.find((pm) => pm.type === 'cash') ?? paymentMethods[0] ?? null
  }, [directMethodId, paymentMethods])

  const isCash = activeMethod?.type === 'cash'
  const changeAmount = isCash && cashInput > subtotal ? cashInput - subtotal : 0
  const underpaidAmount = isCash && cashInput > 0 && cashInput < subtotal ? subtotal - cashInput : 0

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
      const { token } = await apiPost<{ token: string }>(route('pos.midtrans.create-transaction'), { amount: line.amount, type: line.type })

      // snap.pay() cuma MEMBUKA popup lalu langsung kembali (bukan
      // Promise) — status "menunggu" HANYA boleh dilepas dari dalam
      // callback (onSuccess/onPending/onError/onClose) saat popup
      // benar-benar selesai, BUKAN di finally di bawah (yang jalan
      // sesaat setelah popup terbuka, jauh sebelum pelanggan bayar).
      snap.pay(token, {
        onSuccess: applyResult,
        onPending: applyResult,
        onError: () => {
          setPaymentError('Pembayaran Midtrans gagal diproses. Coba lagi.')
          setMidtransPayingKey(null)
        },
        onClose: () => setMidtransPayingKey(null),
      })
    } catch (err) {
      setPaymentError(err instanceof ApiError ? err.firstError() : 'Gagal memulai pembayaran Midtrans.')
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
          gateway_status: l.gateway_status,
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

  // Phase 2: Dialog State untuk 6 Metode Internal/Offline
  const [methodDialog, setMethodDialog] = useState<
    | { type: 'deposit' }
    | { type: 'card' }
    | { type: 'voucher' }
    | { type: 'point'; pointsNeeded: number }
    | { type: 'credit'; limit: number; active: number }
    | { type: 'payroll' }
    | null
  >(null)

  const [depositPin, setDepositPin] = useState('')
  const [edcRefNo, setEdcRefNo] = useState('')
  const [edcBank, setEdcBank] = useState('BCA')
  const [voucherCode, setVoucherCode] = useState('')
  const [methodDialogError, setMethodDialogError] = useState<string | null>(null)

  function executeSaleStore(extraPayload: {
    pin?: string
    reference_no?: string
    point_used?: number
    coupon_code?: string
  } = {}) {
    if (!session || !outlet || !activeMethod) return

    setSubmitting(true)
    setPaymentError(null)

    const finalReceived = isCash ? (cashInput > 0 ? cashInput : subtotal) : subtotal

    router.post(
      route('pos.sales.store'),
      {
        outlet_id: outlet.id,
        cashier_session_id: session.id,
        member_id: member?.id ?? null,
        coupon_code: extraPayload.coupon_code ?? null,
        items: cart.map((l) => ({ product_id: l.product_id, unit_id: l.unit_id, qty: l.qty, unit_price: l.unit_price, product_name: l.product_name, unit_code: l.unit_code })),
        payments: [
          {
            payment_method_id: activeMethod.id,
            amount: subtotal,
            received_amount: activeMethod.allows_change ? finalReceived : subtotal,
            reference_no: extraPayload.reference_no ?? null,
            pin: extraPayload.pin ?? null,
            point_used: extraPayload.point_used ?? null,
          },
        ],
      },
      {
        headers: { 'X-Idempotency-Key': idempotencyKeyRef.current },
        onSuccess: () => {
          setCart([])
          setMember(null)
          setCashInput(0)
          setPaymentError(null)
          setMethodDialog(null)
          idempotencyKeyRef.current = newIdempotencyKey()
        },
        onError: (errors) => {
          const msg = Object.values(errors)[0] ?? 'Gagal menyelesaikan transaksi.'
          setPaymentError(msg)
          setMethodDialogError(msg)
        },
        onFinish: () => setSubmitting(false),
      },
    )
  }

  async function handleDirectSubmit() {
    if (!session || !outlet || cart.length === 0 || subtotal <= 0 || !activeMethod) return

    if (isCash && cashInput > 0 && cashInput < subtotal) {
      setPaymentError(`Uang bayar kurang dari total belanja.`)
      return
    }

    // 1. Saldo Deposit
    if (activeMethod.type === 'deposit') {
      if (!member) {
        setPaymentError('Metode Saldo Deposit membutuhkan anggota yang terpilih.')
        return
      }
      if (member.balance_cache < subtotal) {
        setPaymentError(`Saldo deposit anggota (Rp ${member.balance_cache.toLocaleString('id-ID')}) tidak mencukupi untuk pembayaran Rp ${subtotal.toLocaleString('id-ID')}.`)
        return
      }
      if (subtotal >= noPinThreshold && member.has_pin) {
        setDepositPin('')
        setMethodDialogError(null)
        setMethodDialog({ type: 'deposit' })
        return
      }
    }

    // 2. Kartu Debit / EDC
    if (activeMethod.type === 'card') {
      setEdcRefNo('')
      setEdcBank('BCA')
      setMethodDialogError(null)
      setMethodDialog({ type: 'card' })
      return
    }

    // 3. Voucher Belanja
    if (activeMethod.type === 'voucher') {
      setVoucherCode('')
      setMethodDialogError(null)
      setMethodDialog({ type: 'voucher' })
      return
    }

    // 4. Poin Loyalty
    if (activeMethod.type === 'point') {
      if (!member) {
        setPaymentError('Metode Poin membutuhkan anggota yang terpilih.')
        return
      }
      const pointsNeeded = Math.ceil(subtotal / pointValue)
      if (member.point_balance < pointsNeeded) {
        setPaymentError(`Poin anggota (${member.point_balance} poin) tidak mencukupi untuk penukaran ${pointsNeeded} poin.`)
        return
      }
      setMethodDialogError(null)
      setMethodDialog({ type: 'point', pointsNeeded })
      return
    }

    // 5. Kredit / Tempo
    if (activeMethod.type === 'credit') {
      if (!member) {
        setPaymentError('Metode Kredit/Tempo membutuhkan anggota yang terpilih.')
        return
      }
      try {
        const res = await fetch(`${route('pos.credit-check')}?member_id=${member.id}&amount=${subtotal}`)
        const data = await res.json()
        if (!data.allowed) {
          setPaymentError(`Limit piutang terlampaui: aktif Rp ${(data.active ?? 0).toLocaleString('id-ID')} dari limit Rp ${(data.limit ?? 0).toLocaleString('id-ID')}.`)
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

    // 6. Potong Gaji
    if (activeMethod.type === 'payroll') {
      if (!member) {
        setPaymentError('Metode Potong Gaji membutuhkan anggota yang terpilih.')
        return
      }
      if (!['fasilitator', 'staff'].includes(member.type)) {
        setPaymentError('Metode Potong Gaji hanya berlaku untuk anggota tipe fasilitator/staf.')
        return
      }
      setMethodDialogError(null)
      setMethodDialog({ type: 'payroll' })
      return
    }

    // 7. JIKA METODE MIDTRANS (qris, ewallet, transfer): Panggil Snap Inline Modal Overlay
    if (activeMethod.type === 'qris' || activeMethod.type === 'ewallet' || activeMethod.type === 'transfer') {
      try {
        const { token } = await apiPost<{ token: string }>(route('pos.midtrans.create-transaction'), {
          amount: subtotal,
          type: activeMethod.type,
        })

        type SnapResult = { transaction_id?: string; transaction_status?: 'settlement' | 'capture' | 'pending' }

        const completeSaleWithSnap = (result: unknown) => {
          const r = result as SnapResult
          const refNo = r?.transaction_id ?? `SNAP-${Date.now()}`
          const status = r?.transaction_status ?? 'settlement'

          router.post(
            route('pos.sales.store'),
            {
              outlet_id: outlet.id,
              cashier_session_id: session.id,
              member_id: member?.id ?? null,
              items: cart.map((l) => ({ product_id: l.product_id, unit_id: l.unit_id, qty: l.qty, unit_price: l.unit_price, product_name: l.product_name, unit_code: l.unit_code })),
              payments: [
                {
                  payment_method_id: activeMethod.id,
                  amount: subtotal,
                  received_amount: subtotal,
                  reference_no: refNo,
                  gateway_status: status,
                },
              ],
            },
            {
              headers: { 'X-Idempotency-Key': idempotencyKeyRef.current },
              onSuccess: () => {
                setCart([])
                setMember(null)
                setCashInput(0)
                setPaymentError(null)
                idempotencyKeyRef.current = newIdempotencyKey()
              },
              onError: (errors) => setPaymentError(Object.values(errors)[0] ?? 'Gagal menyelesaikan transaksi.'),
              onFinish: () => setSubmitting(false),
            },
          )
        }

        snap.pay(token, {
          onSuccess: completeSaleWithSnap,
          onPending: completeSaleWithSnap,
          onError: () => {
            setPaymentError('Pembayaran Midtrans gagal diproses. Silakan coba lagi.')
            setSubmitting(false)
          },
          onClose: () => {
            setSubmitting(false)
          },
        })
      } catch (err) {
        setPaymentError(err instanceof ApiError ? err.firstError() : 'Gagal memulai transaksi Midtrans.')
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
      <div className="flex flex-1 overflow-hidden">
        {/* GRID 1: KATALOG PRODUK & SEARCH (Kolom Kiri Terbesar - Flex Expand) */}
        <section className="flex flex-1 min-w-0 flex-col gap-3 overflow-hidden border-r border-gray-200 bg-gray-50/60 p-3">
          {/* Search bar Barcode */}
          <div className="relative shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
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
              className="h-10 w-full rounded-xl border border-gray-200 bg-white/90 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 neu-pressed transition-all focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
            <ScanLine className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          </div>
          {scanError && <p className="-mt-2 text-sm text-danger">{scanError}</p>}

          {/* Filter Bar & Header Katalog */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-navy-800">Katalog Produk</h2>
              <Badge variant="secondary" className="text-[10px] bg-navy-100 text-navy-800 font-semibold">
                {catalog.total} produk
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Cari produk…"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && reloadCatalog({ search: catalogSearch })}
                className={`h-7 w-32 sm:w-40 rounded-lg text-xs neu-pressed ${posFieldClass}`}
              />
              <Select
                value={catalogCategory || 'all'}
                onValueChange={(v) => {
                  const val = v === 'all' ? '' : v
                  setCatalogCategory(val)
                  reloadCatalog({ category_id: val })
                }}
              >
                <SelectTrigger className={`h-7 w-32 rounded-lg text-xs neu-pressed ${posFieldClass}`}>
                  <SelectValue placeholder="Semua kategori" />
                </SelectTrigger>
                <SelectContent className={posDropdownClass}>
                  <SelectItem value="all">Semua kategori</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Product Cards Grid (Vertikal Scrollable) */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
              {catalog.data.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => p.unit && addLine({ id: p.id, name: p.name, sku: p.sku, image_url: p.image_url }, p.unit, p.price, 1)}
                  className="group relative flex flex-col justify-between rounded-xl border border-gray-200/80 bg-white p-2 text-left transition-all duration-200 neu-flat hover:-translate-y-0.5 hover:border-navy-400 hover:shadow-lg active:scale-95"
                >
                  <div>
                    <div className="relative mb-1.5 aspect-square w-full overflow-hidden rounded-lg bg-gray-50 border border-gray-100">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="size-full object-contain p-1 transition-transform group-hover:scale-105" loading="lazy" />
                      ) : (
                        <div className="flex size-full items-center justify-center text-center text-[10px] text-gray-400">Tidak ada gambar</div>
                      )}
                      {p.has_promo && (
                        <Badge className="absolute right-1 top-1 bg-amber-500 px-1.5 py-0 text-[9px] font-bold text-white shadow-sm">PROMO</Badge>
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs font-semibold leading-tight text-gray-900 group-hover:text-navy-700">{p.name}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-1.5">
                    <p className="text-xs font-bold text-navy-700"><Money amount={p.price} size="sm" /></p>
                    <span className="text-[10px] font-bold text-navy-500 bg-navy-50 px-1.5 py-0.5 rounded border border-navy-200/60">+ Tambah</span>
                  </div>
                </button>
              ))}
            </div>

            {catalog.data.length === 0 && (
              <div className="flex h-48 flex-col items-center justify-center text-gray-400">
                <Search className="mb-2 size-8 opacity-30" />
                <p className="text-sm">Tidak ada produk berstok yang cocok.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {catalog.last_page > 1 && (
            <div className="flex shrink-0 items-center justify-between border-t border-gray-200 pt-2 text-xs text-gray-600">
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={catalog.current_page <= 1} onClick={() => reloadCatalog({ page: catalog.current_page - 1 })}>◀ Sebelum</Button>
              <span className="font-medium">Hal. {catalog.current_page} dari {catalog.last_page}</span>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={catalog.current_page >= catalog.last_page} onClick={() => reloadCatalog({ page: catalog.current_page + 1 })}>Lanjut ▶</Button>
            </div>
          )}
        </section>

        {/* GRID 2: KERANJANG TRANSAKSI (Kolom Tengah ~420px - 480px) */}
        <section className="flex w-[400px] lg:w-[450px] xl:w-[480px] shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white p-3">
          <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-navy-800">Keranjang Transaksi</h2>
              <Badge className="bg-navy-700 text-white font-bold text-xs">{cart.reduce((sum, item) => sum + item.qty, 0)} item</Badge>
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
          <div className="flex-1 flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white neu-flat">
            {/* Table Header */}
            <div className="grid grid-cols-12 items-center gap-1.5 border-b border-gray-200 bg-navy-50/80 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-navy-800">
              <div className="col-span-3">Produk</div>
              <div className="col-span-3 text-right">Harga</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-3 text-right">Total</div>
              <div className="col-span-1 text-center">#</div>
            </div>

            {/* Table Body Scrollable */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {cart.map((line) => (
                <div
                  key={line.key}
                  className="grid grid-cols-12 items-center gap-1.5 px-3 py-2.5 text-xs transition-colors hover:bg-gray-50/80"
                >
                  {/* Produk & SKU */}
                  <div className="col-span-3 min-w-0 pr-1">
                    <p className="truncate font-bold text-gray-900 text-xs" title={line.product_name}>
                      {line.product_name}
                    </p>
                    {line.product_sku && (
                      <p className="text-[10px] font-mono text-gray-400 truncate">
                        {line.product_sku}
                      </p>
                    )}
                  </div>

                  {/* Harga Satuan */}
                  <div className="col-span-3 text-right font-medium text-navy-800 text-xs whitespace-nowrap">
                    <Money amount={line.unit_price} size="sm" />
                  </div>

                  {/* Qty Stepper */}
                  <div className="col-span-2 flex justify-center">
                    <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => updateQty(line.key, -1)}
                        className="flex size-5 items-center justify-center rounded text-xs font-bold text-gray-700 hover:bg-gray-100 active:scale-95"
                      >
                        −
                      </button>
                      <span className="w-4 text-center font-mono text-xs font-bold text-navy-950">{line.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(line.key, 1)}
                        className="flex size-5 items-center justify-center rounded text-xs font-bold text-gray-700 hover:bg-gray-100 active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Subtotal Item */}
                  <div className="col-span-3 text-right font-mono font-bold text-navy-950 text-xs whitespace-nowrap">
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
        <aside className="flex w-[300px] lg:w-[320px] shrink-0 flex-col border-l border-gray-200 bg-white overflow-hidden">
          {/* Top & Middle Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Pelanggan / Member */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Pelanggan / Member</h3>
                {member && (
                  <button type="button" onClick={() => setMember(null)} className="text-gray-500 hover:text-gray-700">
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {!member ? (
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => memberInputRef.current?.focus()}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-navy-300 py-2 text-xs font-medium text-navy-600 transition-colors hover:border-navy-500 hover:bg-navy-50"
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
                  {memberResults.length > 0 && (
                    <div className="flex flex-col divide-y divide-gray-100 rounded-lg border border-gray-300">
                      {memberResults.map((m) => (
                        <button key={m.id} type="button" onClick={() => pickMember(m)} className="p-1.5 text-left text-xs hover:bg-gray-50">
                          <p className="font-medium text-gray-900">{m.name}</p>
                          <p className="text-[11px] text-gray-500">{m.member_number} · <Money amount={m.balance_cache} size="sm" /></p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
                  <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200">
                    <UserCircle className="size-full p-1 text-gray-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-gray-900">{member.name}</p>
                    <p className="text-[11px] text-gray-500">Saldo: <span className="font-mono font-medium text-navy-700"><Money amount={member.balance_cache} size="sm" /></span></p>
                    <p className="text-[11px] text-gray-500">ID Member: {member.member_number}</p>
                    {member.level && <Badge className="mt-1 text-[10px]" variant="outline">{member.level.name}</Badge>}
                  </div>
                </div>
              )}
            </section>

            {/* Ringkasan */}
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Ringkasan</h3>
              <div className="space-y-1.5 text-xs">
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
                <div className="mt-1.5 border-t border-gray-200 pt-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold text-gray-900">TOTAL</span>
                    <span className="font-mono text-lg font-bold text-navy-700"><Money amount={subtotal} size="lg" /></span>
                  </div>
                </div>
              </div>
            </section>

            {/* METODE PEMBAYARAN (Grid Selector Direct - Compact Aesthetic State) */}
            <section>
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-widest text-gray-500">Metode Pembayaran</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {paymentMethods.map((pm) => {
                  const isSelected = activeMethod?.id === pm.id
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setDirectMethodId(pm.id)}
                      className={cn(
                        'relative flex items-center justify-between rounded-lg border p-1.5 px-2.5 text-left transition-all duration-150 active:scale-95 shadow-2xs',
                        isSelected
                          ? 'border-navy-900 bg-navy-900 text-white shadow-md shadow-navy-900/30 ring-1 ring-navy-600 scale-[1.01]'
                          : 'border-gray-200 bg-white text-gray-800 hover:border-navy-400 hover:bg-navy-50/40',
                      )}
                    >
                      <span className={cn('text-[11px] font-bold leading-tight truncate', isSelected ? 'text-white' : 'text-gray-900')}>
                        {pm.name}
                      </span>
                      {isSelected && (
                        <div className="flex size-3.5 items-center justify-center rounded-full bg-amber-400 text-navy-950 shadow-2xs shrink-0 ml-1">
                          <Check className="size-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>

            {/* FITUR KHUSUS CASH / TUNAI: Hitung Kembalian Otomatis */}
            {isCash && (
              <section className="rounded-xl border border-gray-200 bg-gray-50/70 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">Nominal Uang Bayar</span>
                  <button
                    type="button"
                    onClick={() => setCashInput(subtotal)}
                    className="text-[11px] font-bold text-navy-700 hover:underline"
                  >
                    Uang Pas
                  </button>
                </div>

                {/* Quick Nominal Chips */}
                <div className="flex flex-wrap gap-1">
                  {[10000, 20000, 50000, 100000].map((nominal) => (
                    <button
                      key={nominal}
                      type="button"
                      onClick={() => setCashInput(nominal)}
                      className={`rounded-md border px-2 py-1 text-[11px] font-mono font-semibold transition-colors ${
                        cashInput === nominal
                          ? 'border-navy-600 bg-navy-600 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
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
                    className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-xs font-mono font-bold text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500"
                  />
                </div>

                {/* Live Kembalian / Kekurangan Preview Box */}
                {cashInput > 0 && (
                  <div>
                    {cashInput >= subtotal ? (
                      <div className="flex items-center justify-between rounded-lg border border-green-300 bg-green-50 p-2 text-xs text-green-900 font-semibold">
                        <span>Kembalian:</span>
                        <span className="font-mono text-sm font-extrabold text-green-700">
                          Rp {(changeAmount).toLocaleString('id-ID')}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 font-semibold">
                        <span>Uang Kurang:</span>
                        <span className="font-mono text-xs font-bold text-amber-700">
                          Rp {(underpaidAmount).toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {holdError && <p className="text-xs text-danger">{holdError}</p>}
            {paymentError && <p className="text-xs text-red-600 font-semibold bg-red-50 p-2 rounded border border-red-200">{paymentError}</p>}
          </div>

          {/* Fixed Bottom Action Footer */}
          <div className="shrink-0 border-t border-gray-200 bg-white p-3 space-y-2 shadow-md">
            {/* Tombol Bayar Langsung */}
            <button
              type="button"
              onClick={handleDirectSubmit}
              disabled={cart.length === 0 || submitting || (isCash && cashInput > 0 && cashInput < subtotal)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-success py-3 text-sm font-bold text-white transition-all duration-150 hover:bg-success/90 disabled:bg-gray-300 disabled:shadow-none shadow-md shadow-emerald-900/30 neu-btn-primary active:scale-95"
            >
              <Wallet className="size-4" />
              {submitting
                ? 'Memproses…'
                : `BAYAR Rp ${(subtotal).toLocaleString('id-ID')} (F9)`}
            </button>

            {/* Cash Masuk / Cash Keluar */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => openCashDialog('in')}
                className="group flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white p-2 text-left transition-colors hover:border-green-300 hover:bg-green-50"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-green-100 transition-colors group-hover:bg-green-200">
                  <ArrowDownCircle className="size-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-green-700">Cash Masuk</p>
                  <p className="text-[10px] text-gray-500">Kas laci</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => openCashDialog('out')}
                className="group flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white p-2 text-left transition-colors hover:border-red-300 hover:bg-red-50"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-100 transition-colors group-hover:bg-red-200">
                  <ArrowUpCircle className="size-4 text-red-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-700">Cash Keluar</p>
                  <p className="text-[10px] text-gray-500">Kas kecil</p>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setHoldsOpen(true)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Transaksi Ditahan ({holds.length})
            </button>
          </div>
        </aside>
    </div>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="bg-white text-gray-900">
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
                        <p className="text-xs text-gray-500">Saldo anggota: <Money amount={member.balance_cache} size="sm" /></p>
                        {line.amount >= noPinThreshold && (
                          <>
                            <Label className="text-xs text-gray-600">PIN Anggota {!member.has_pin && '(belum dibuat)'}</Label>
                            <PinInput value={line.pin ?? ''} onChange={(v) => updatePaymentLine(line.key, { pin: v })} />
                          </>
                        )}
                      </div>
                    )}
                    {line.type === 'credit' && creditWarning && (
                      <p className="text-xs text-danger">{creditWarning}</p>
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
                          <div className="rounded-md border border-success/30 bg-success/10 px-2.5 py-1.5">
                            <span className="text-xs text-success">✓ Dibayar via Midtrans · {line.reference_no}</span>
                          </div>
                        ) : (
                          <Button type="button" variant="outline" size="sm" onClick={() => void payLineWithMidtrans(line)}>
                            Coba lagi via Midtrans
                          </Button>
                        )}
                      </div>
                    )}
                    {line.type === 'point' && member && (
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs text-gray-600">Poin Dipakai (maks {member.point_balance}, {pointValue.toLocaleString('id-ID')}/poin)</Label>
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
                          className={posFieldClass}
                        />
                        <p className="text-xs text-gray-500">Setara <Money amount={line.amount} size="sm" /></p>
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
        <DialogContent className="bg-white text-gray-900">
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
        <DialogContent className="bg-white text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900">{cashDialog === 'in' ? 'Cash Masuk' : 'Cash Keluar'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label className="text-gray-600">Nominal</Label>
              <MoneyInput value={cashAmount} onChange={setCashAmount} className={posFieldClass} />
            </div>
            <div>
              <Label className="text-gray-600">Keterangan</Label>
              <Input value={cashDescription} onChange={(e) => setCashDescription(e.target.value)} placeholder="Contoh: Setoran modal awal" className={posFieldClass} />
            </div>
            {cashError && <p className="text-sm text-danger">{cashError}</p>}
          </div>
          <DialogFooter className="bg-gray-50">
            <Button onClick={submitCash} disabled={cashSubmitting}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Modal Input Metode Pembayaran (Phase 2) */}
      <Dialog open={methodDialog !== null} onOpenChange={(open) => !open && setMethodDialog(null)}>
        <DialogContent className="bg-white text-gray-900 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 font-extrabold text-base">
              {methodDialog?.type === 'deposit' && 'Otentikasi PIN Deposit Member'}
              {methodDialog?.type === 'card' && 'Detail Transaksi Mesin EDC (Kartu)'}
              {methodDialog?.type === 'voucher' && 'Input Voucher Belanja Toko'}
              {methodDialog?.type === 'point' && 'Penukaran Poin Loyalty Member'}
              {methodDialog?.type === 'credit' && 'Konfirmasi Kredit / Tempo (Piutang)'}
              {methodDialog?.type === 'payroll' && 'Konfirmasi Pemotongan Gaji Pegawai'}
            </DialogTitle>
          </DialogHeader>

          {methodDialog?.type === 'deposit' && member && (
            <div className="flex flex-col gap-3 py-1">
              <div className="rounded-xl border border-navy-200 bg-navy-50/60 p-3 text-xs space-y-1">
                <p className="font-semibold text-navy-900">Anggota: <span className="font-bold">{member.name}</span> ({member.member_number})</p>
                <p className="text-gray-600">Saldo Deposit: <span className="font-bold text-emerald-700">Rp {member.balance_cache.toLocaleString('id-ID')}</span></p>
                <p className="text-gray-600">Total Belanja: <span className="font-bold text-navy-950">Rp {subtotal.toLocaleString('id-ID')}</span></p>
              </div>
              <div className="space-y-1.5 text-center">
                <Label className="text-xs text-gray-600 font-semibold">Masukkan PIN Anggota (6-digit)</Label>
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
                    <SelectItem value="CIMB">EDC CIMB Niaga</SelectItem>
                    <SelectItem value="Lainnya">Mesin EDC Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">No. Referensi / Trace EDC (Wajib)</Label>
                <Input
                  value={edcRefNo}
                  onChange={(e) => setEdcRefNo(e.target.value)}
                  placeholder="Contoh: 123456 (tertera di struk EDC)"
                  className={posFieldClass}
                  autoFocus
                />
              </div>
            </div>
          )}

          {methodDialog?.type === 'voucher' && (
            <div className="flex flex-col gap-3 py-1">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Kode / Barcode Voucher</Label>
                <Input
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  placeholder="Scan atau ketik kode voucher…"
                  className={posFieldClass}
                  autoFocus
                />
              </div>
            </div>
          )}

          {methodDialog?.type === 'point' && member && (
            <div className="flex flex-col gap-3 py-1">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs space-y-1.5">
                <p className="font-semibold text-amber-950">Anggota: <span className="font-bold">{member.name}</span></p>
                <p className="text-amber-800">Total Poin Dimiliki: <span className="font-bold font-mono">{member.point_balance} poin</span></p>
                <p className="text-amber-800">Poin Dibutuhkan: <span className="font-bold font-mono text-amber-950">{methodDialog.pointsNeeded} poin</span></p>
                <p className="text-xs text-amber-700 font-mono">Rate: 1 Poin = Rp {pointValue.toLocaleString('id-ID')}</p>
              </div>
            </div>
          )}

          {methodDialog?.type === 'credit' && member && (
            <div className="flex flex-col gap-3 py-1">
              <div className="rounded-xl border border-navy-200 bg-navy-50/70 p-3 text-xs space-y-1.5">
                <p className="font-semibold text-navy-950">Anggota: <span className="font-bold">{member.name}</span> ({member.member_number})</p>
                <p className="text-navy-800">Limit Piutang: <span className="font-bold font-mono">Rp {methodDialog.limit.toLocaleString('id-ID')}</span></p>
                <p className="text-navy-800">Piutang Aktif: <span className="font-bold font-mono">Rp {methodDialog.active.toLocaleString('id-ID')}</span></p>
                <p className="text-navy-900 border-t border-navy-200 pt-1">Belanja Baru (Jatuh Tempo 30 Hari): <span className="font-bold text-emerald-700 font-mono">Rp {subtotal.toLocaleString('id-ID')}</span></p>
              </div>
            </div>
          )}

          {methodDialog?.type === 'payroll' && member && (
            <div className="flex flex-col gap-3 py-1">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs space-y-1.5">
                <p className="font-semibold text-emerald-950">Pegawai/Staf: <span className="font-bold">{member.name}</span> ({member.member_number})</p>
                <p className="text-emerald-800">Jabatan/Tipe: <span className="font-bold uppercase font-mono">{member.type}</span></p>
                <p className="text-emerald-900 border-t border-emerald-200 pt-1">Total Potong Gaji Periode Ini: <span className="font-bold text-emerald-950 font-mono">Rp {subtotal.toLocaleString('id-ID')}</span></p>
              </div>
            </div>
          )}

          {methodDialogError && (
            <p className="text-xs text-red-600 font-semibold bg-red-50 p-2 rounded border border-red-200">{methodDialogError}</p>
          )}

          <DialogFooter className="bg-gray-50 flex gap-2">
            <Button variant="outline" onClick={() => setMethodDialog(null)}>Batal</Button>
            <Button
              disabled={submitting}
              onClick={() => {
                if (methodDialog?.type === 'deposit') {
                  if (subtotal >= noPinThreshold && depositPin.length < 6) {
                    setMethodDialogError('PIN harus 6 digit angka.')
                    return
                  }
                  executeSaleStore({ pin: depositPin })
                } else if (methodDialog?.type === 'card') {
                  if (!edcRefNo.trim()) {
                    setMethodDialogError('Nomor referensi / approval EDC wajib diisi.')
                    return
                  }
                  executeSaleStore({ reference_no: `${edcBank}-${edcRefNo.trim()}` })
                } else if (methodDialog?.type === 'voucher') {
                  if (!voucherCode.trim()) {
                    setMethodDialogError('Kode voucher wajib diisi.')
                    return
                  }
                  executeSaleStore({ reference_no: voucherCode.trim(), coupon_code: voucherCode.trim() })
                } else if (methodDialog?.type === 'point') {
                  executeSaleStore({ point_used: methodDialog.pointsNeeded })
                } else if (methodDialog?.type === 'credit') {
                  executeSaleStore()
                } else if (methodDialog?.type === 'payroll') {
                  executeSaleStore({ reference_no: member?.member_number ?? '' })
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white"
            >
              {submitting ? 'Memproses…' : 'Konfirmasi & Bayar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Popup Berhasil Transaksi (Center Screen Overlay) */}
      <Dialog open={completedSale !== null} onOpenChange={(open) => !open && setCompletedSale(null)}>
        <DialogContent className="bg-white text-gray-900 max-w-sm text-center p-6 rounded-2xl shadow-xl">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-md">
            <CheckCircle2 className="size-8 stroke-[2.5]" />
          </div>
          <div className="mt-3 space-y-1">
            <h3 className="text-lg font-extrabold text-gray-900">Transaksi Berhasil!</h3>
            <p className="text-xs text-gray-500 font-mono">No. Nota: <span className="font-bold text-navy-950">{completedSale?.ref}</span></p>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <Button
              onClick={() => {
                if (completedSale) {
                  window.open(route('pos.sales.receipt-pdf', completedSale.id), '_blank', 'width=400,height=600')
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white w-full rounded-xl py-2.5 shadow-sm"
            >
              <Printer className="mr-2 size-4" /> Cetak Struk (PDF)
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setCompletedSale(null)
                focusScan()
              }}
              className="border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold w-full rounded-xl"
            >
              Transaksi Baru (Esc)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PosLayout>
  )
}
