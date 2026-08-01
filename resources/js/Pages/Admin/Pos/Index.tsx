import { useCallback, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { router, usePage } from '@inertiajs/react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Minus, Plus, Trash2, User, X } from 'lucide-react'
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
type FavoriteProduct = {
  id: number
  name: string
  sku: string
  base_unit_id: number
  base_unit: { id: number; code: string; name: string }
  barcodes: { id: number; barcode: string; is_primary: boolean }[]
}
type HoldRow = { id: number; reference: string; item_count: number; total: number; held_at: string; member_id: number | null }
type SessionInfo = { id: number; reference: string; opened_at: string } | null
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
  favoriteProducts: FavoriteProduct[]
  holds: HoldRow[]
  noPinThreshold: number
  pointValue: number
}

export default function Index({ session, outlet, paymentMethods, favoriteProducts, holds, noPinThreshold, pointValue }: PosIndexProps) {
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
  const barcodeRef = useRef<HTMLInputElement>(null)

  const subtotal = useMemo(() => cart.reduce((sum, line) => sum + line.qty * line.unit_price, 0), [cart])

  function focusScan() {
    barcodeRef.current?.focus()
  }

  function addLine(product: { id: number; name: string }, unit: { id: number; code: string }, price: number, qtyMultiplier: number) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product_id === product.id && l.unit_id === unit.id)

      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, qty: l.qty + qtyMultiplier } : l))
      }

      return [...prev, { key: `${product.id}-${unit.id}-${Date.now()}`, product_id: product.id, unit_id: unit.id, product_name: product.name, unit_code: unit.code, qty: qtyMultiplier, unit_price: price }]
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

  function addFavorite(product: FavoriteProduct) {
    const primary = product.barcodes.find((b) => b.is_primary) ?? product.barcodes[0]

    if (!primary) return

    void submitScan(primary.barcode)
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

  function recallHold(hold: HoldRow) {
    fetch(route('pos.holds.recall', hold.id))
      .then((res) => res.json())
      .then((data) => {
        const recalledItems = (data.cart?.items ?? []) as { product_id: number; unit_id: number; qty: number; unit_price?: number; product_name?: string; unit_code?: string }[]
        setCart(
          recalledItems.map((it, index) => ({
            key: `recall-${index}-${Date.now()}`,
            product_id: it.product_id,
            unit_id: it.unit_id,
            product_name: it.product_name ?? `Produk #${it.product_id}`,
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
        setCreditWarning(`Limit piutang terlampaui: aktif Rp ${data.active.toLocaleString('id-ID')} dari limit Rp ${data.limit.toLocaleString('id-ID')}.`)
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
        headers: { 'X-Idempotency-Key': newIdempotencyKey() },
        onSuccess: () => {
          setCart([])
          setMember(null)
          setPaymentOpen(false)
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
  useHotkeys('esc', () => { setPaymentOpen(false); setHoldsOpen(false) })

  if (!session) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-content">
        <p className="text-lg font-medium">Belum ada sesi kasir aktif.</p>
        <Button onClick={() => router.visit(route('admin.cashier-session.index'))}>Buka Sesi Kasir</Button>
      </div>
    )
  }

  return (
    <div className="grid h-full grid-cols-1 gap-0 overflow-hidden md:grid-cols-[1fr_360px]">
      <div className="flex flex-col overflow-hidden border-r border-border p-3">
        <Input
          ref={barcodeRef}
          autoFocus
          placeholder="Scan barcode / cari produk… (F3)"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void submitScan(barcode)
            }
          }}
          className="h-11 text-base"
        />
        {scanError && <p className="mt-1 text-sm text-danger">{scanError}</p>}

        <div className="mt-3 flex-1 overflow-y-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="text-left text-content-muted">
                <th className="p-2">#</th>
                <th className="p-2">Produk</th>
                <th className="p-2">Qty</th>
                <th className="p-2 text-right">Harga</th>
                <th className="p-2 text-right">Subtotal</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((line, index) => (
                <tr key={line.key} className="border-t border-border">
                  <td className="p-2">{index + 1}</td>
                  <td className="p-2">{line.product_name}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      <Button type="button" size="icon-sm" variant="ghost" onClick={() => updateQty(line.key, -1)}>
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-10 text-center font-mono tabular-nums">{line.qty}</span>
                      <Button type="button" size="icon-sm" variant="ghost" onClick={() => updateQty(line.key, 1)}>
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  </td>
                  <td className="p-2 text-right"><Money amount={line.unit_price} size="sm" /></td>
                  <td className="p-2 text-right"><Money amount={line.qty * line.unit_price} size="sm" /></td>
                  <td className="p-2">
                    <Button type="button" size="icon-sm" variant="ghost" onClick={() => removeLine(line.key)}>
                      <Trash2 className="size-3.5 text-danger" />
                    </Button>
                  </td>
                </tr>
              ))}
              {cart.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-content-muted">Keranjang kosong — scan barcode untuk mulai.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3">
          <p className="mb-1 text-xs text-content-muted">Produk Favorit</p>
          <div className="flex flex-wrap gap-2">
            {favoriteProducts.map((p) => (
              <Button key={p.id} type="button" variant="outline" size="sm" onClick={() => addFavorite(p)}>
                {p.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col overflow-y-auto p-3">
        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Anggota</p>
            {member && (
              <Button type="button" size="icon-sm" variant="ghost" onClick={() => setMember(null)}>
                <X className="size-3.5" />
              </Button>
            )}
          </div>
          {!member ? (
            <div className="flex flex-col gap-1">
              <Input placeholder="Scan kartu / NIS / cari nama…" value={memberQuery} onChange={(e) => void searchMember(e.target.value)} />
              {memberResults.length > 0 && (
                <div className="flex flex-col divide-y divide-border rounded-md border border-border">
                  {memberResults.map((m) => (
                    <button key={m.id} type="button" onClick={() => pickMember(m)} className="p-2 text-left text-sm hover:bg-bg">
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-content-muted">{m.member_number} · <Money amount={m.balance_cache} size="sm" /></p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <User className="size-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{member.name}</p>
                <p className="text-xs text-content-muted">{member.class_name ?? '-'} {member.major ?? ''}</p>
                {member.level && <Badge className="mt-1" variant="outline">{member.level.name}</Badge>}
              </div>
              <div className="text-right">
                <p className="text-xs text-content-muted">Saldo</p>
                <Money amount={member.balance_cache} />
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 flex-1 rounded-lg border border-border bg-surface p-3">
          <div className="flex justify-between py-1 text-sm">
            <span className="text-content-muted">Subtotal</span>
            <Money amount={subtotal} size="sm" />
          </div>
          <div className="flex justify-between border-t border-border pt-2 mt-2">
            <span className="text-lg font-semibold">TOTAL</span>
            <Money amount={subtotal} size="lg" />
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {holdError && <p className="text-sm text-danger">{holdError}</p>}
          <Button size="lg" className="h-14 bg-success text-white hover:bg-success/90" onClick={openPayment} disabled={cart.length === 0}>
            F9 &nbsp; BAYAR
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={doHold} disabled={cart.length === 0}>F4 Hold</Button>
            <Button variant="outline" onClick={() => setHoldsOpen(true)}>F5 Recall ({holds.length})</Button>
          </div>
        </div>
      </div>

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
                              +Rp {amt.toLocaleString('id-ID')}
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
                  <p className="text-xs text-content-muted">{h.item_count} item · {new Date(h.held_at).toLocaleTimeString('id-ID')}</p>
                </div>
                <Money amount={h.total} size="sm" />
              </button>
            ))}
          </div>
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
      onCloseSession={() => router.visit(route('admin.cashier-session.index'))}
    >
      {children}
    </PosLayout>
  )
}

Index.layout = (page: ReactElement) => <PosIndexShell>{page}</PosIndexShell>
