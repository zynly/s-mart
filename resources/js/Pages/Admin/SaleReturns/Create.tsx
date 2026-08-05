import { useMemo, useRef, useState, type ReactElement } from 'react'
import { router } from '@inertiajs/react'
import { toast } from 'sonner'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { Money } from '@/Components/common/Money'
import { SupervisorPinDialog } from '@/Components/common/SupervisorPinDialog'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Textarea } from '@/Components/ui/textarea'
import { Badge } from '@/Components/ui/badge'
import { Card, CardContent } from '@/Components/ui/card'
import { Checkbox } from '@/Components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { newIdempotencyKey } from '@/Lib/idempotency'

type SessionInfo = { id: number; reference: string } | null

type SaleReturnCreateProps = {
  session: SessionInfo
}

type SaleInfo = { id: number; reference: string; sale_date: string; grand_total: number }
type MemberInfo = { id: number; name: string; member_number: string } | null

type ReturnableItem = {
  sale_item_id: number
  product_name: string
  unit_code: string
  unit_price: number
  unit_net_value: number
  qty_sold: number
  qty_returned: number
  qty_returnable: number
}

type CartItem = {
  sale_item_id: number
  product_name: string
  unit_code: string
  unit_price: number
  /** Nilai net per unit (setelah semua diskon) — dipakai utk estimasi, bukan unit_price kotor. */
  unit_net_value: number
  qty_returnable: number
  qty: number
  condition: 'good' | 'damaged'
  restock: boolean
}

type RefundLine = {
  sale_payment_id: number
  method_name: string
  method_type: string
  original_amount: number
  already_refunded: number
  refundable: number
  allocated: number
  allowed_targets: string[]
  default_target: string
  note: string | null
}

type RefundPreview = {
  origin_session_status: string
  cash_allowed: boolean
  lines: RefundLine[]
  total_allocated: number
}

const REASON_LABELS: Record<string, string> = {
  damaged: 'Rusak',
  wrong_item: 'Salah Barang',
  expired: 'Kedaluwarsa',
  customer_request: 'Permintaan Pembeli',
  other: 'Lainnya',
}

const TARGET_LABELS: Record<string, string> = {
  same: 'Metode Asal',
  deposit: 'Saldo Deposit',
  transfer: 'Transfer Manual',
  forfeited: 'Hangus',
}

export default function Create({ session }: SaleReturnCreateProps) {
  const [reference, setReference] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [sale, setSale] = useState<SaleInfo | null>(null)
  const [member, setMember] = useState<MemberInfo>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [reason, setReason] = useState('other')
  const [reasonDetail, setReasonDetail] = useState('')
  const [preview, setPreview] = useState<RefundPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [refundTargets, setRefundTargets] = useState<Record<number, string>>({})
  const [pinOpen, setPinOpen] = useState(false)
  const [approvalToken, setApprovalToken] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Temuan audit keamanan: key idempotency dibuat sekali per kunjungan
  // halaman (bukan per klik submit) — retry setelah gagal/network lambat
  // pakai key yang sama supaya backend bisa men-dedup dengan benar.
  const idempotencyKeyRef = useRef(newIdempotencyKey())

  // Audit Fase 2 (Temuan Kritis #2): estimasi tampilan SAJA, dari
  // unit_net_value (sudah net semua diskon) — bukan unit_price kotor.
  // Nilai yang benar-benar dieksekusi selalu dihitung ulang di server
  // (calculateNetReturnValue()), estimasi ini murni supaya tombol
  // "Proses Retur" tidak aktif saat keranjang kosong.
  const refundTotal = useMemo(
    () => cart.reduce((sum, l) => sum + l.qty * l.unit_net_value, 0),
    [cart],
  )

  async function lookupSale() {
    if (!reference.trim()) return

    setSearching(true)
    setSearchError(null)
    setSale(null)
    setMember(null)
    setCart([])
    setPreview(null)

    try {
      const res = await fetch(`${route('pos.returns.lookup')}?reference=${encodeURIComponent(reference.trim())}`)
      const data = await res.json()

      if (!res.ok) {
        setSearchError(data.message ?? 'Nota tidak ditemukan.')
        return
      }

      setSale(data.sale)
      setMember(data.member)
      setCart(
        (data.items as ReturnableItem[])
          .filter((item) => item.qty_returnable > 0)
          .map((item) => ({
            sale_item_id: item.sale_item_id,
            product_name: item.product_name,
            unit_code: item.unit_code,
            unit_price: item.unit_price,
            unit_net_value: item.unit_net_value,
            qty_returnable: item.qty_returnable,
            qty: 0,
            condition: 'good',
            restock: true,
          })),
      )
    } catch {
      setSearchError('Gagal mencari nota.')
    } finally {
      setSearching(false)
    }
  }

  function updateCartLine(saleItemId: number, patch: Partial<CartItem>) {
    setCart((prev) => prev.map((l) => (l.sale_item_id === saleItemId ? { ...l, ...patch } : l)))
    setPreview(null)
  }

  async function refreshPreview() {
    if (!sale || refundTotal <= 0) {
      setPreview(null)
      return
    }

    setPreviewLoading(true)

    try {
      const res = await fetch(route('pos.returns.refund-preview'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? ''),
        },
        body: JSON.stringify({
          sale_id: sale.id,
          items: selectedItems().map((l) => ({ sale_item_id: l.sale_item_id, qty: l.qty })),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setSubmitError(data.message ?? 'Gagal menghitung preview refund.')
        setPreview(null)
        return
      }

      setPreview(data)
      setRefundTargets(Object.fromEntries((data as RefundPreview).lines.map((l) => [l.sale_payment_id, l.default_target])))
    } finally {
      setPreviewLoading(false)
    }
  }

  function selectedItems() {
    return cart.filter((l) => l.qty > 0)
  }

  function doSubmit(approvalToken: string | null) {
    if (!sale || !session) return

    const items = selectedItems()
    if (items.length === 0) return

    setSubmitting(true)
    setSubmitError(null)

    router.post(
      route('pos.returns.store'),
      {
        sale_id: sale.id,
        cashier_session_id: session.id,
        reason,
        reason_detail: reasonDetail || null,
        approval_token: approvalToken,
        items: items.map((l) => ({
          sale_item_id: l.sale_item_id,
          qty: l.qty,
          condition: l.condition,
          restock: l.restock,
        })),
        refund_targets: preview
          ? preview.lines.map((l) => ({ sale_payment_id: l.sale_payment_id, target: refundTargets[l.sale_payment_id] ?? l.default_target }))
          : [],
      },
      {
        headers: { 'X-Idempotency-Key': idempotencyKeyRef.current },
        onError: (errors) => {
          setSubmitError(Object.values(errors)[0] ?? 'Gagal memproses retur.')
          toast.error(Object.values(errors)[0] ?? 'Gagal memproses retur.')
        },
        onFinish: () => setSubmitting(false),
      },
    )
  }

  function submit() {
    if (selectedItems().length === 0) {
      setSubmitError('Pilih minimal satu item untuk diretur.')
      return
    }

    const needsSupervisor = preview?.lines.some((l) => l.method_type !== 'voucher') ?? true

    if (needsSupervisor && !approvalToken) {
      setPinOpen(true)
      return
    }

    doSubmit(approvalToken)
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-content">
        <p className="text-lg font-medium">Belum ada sesi kasir aktif.</p>
        <Button onClick={() => router.visit(route('admin.cashier-session.index'))}>Buka Sesi Kasir</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Buat Retur Penjualan" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Retur Penjualan', href: '/admin/sale-returns' }, { label: 'Buat Retur' }]} />

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <Label>Referensi Nota</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Contoh: TRX-20260731-0001"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void lookupSale()
                }
              }}
            />
            <Button type="button" onClick={() => void lookupSale()} disabled={searching}>Cari</Button>
          </div>
          {searchError && <p className="text-sm text-danger">{searchError}</p>}
          {sale && (
            <div className="flex flex-wrap items-center gap-3 rounded-md bg-bg p-3 text-sm">
              <span className="font-medium">{sale.reference}</span>
              <span className="text-content-muted">{new Date(sale.sale_date).toLocaleString('id-ID')}</span>
              <Money amount={sale.grand_total} size="sm" />
              {member && <Badge variant="outline">{member.name} ({member.member_number})</Badge>}
            </div>
          )}
        </CardContent>
      </Card>

      {sale && cart.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            <p className="font-medium">Item yang Bisa Diretur</p>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface text-left text-content-muted">
                  <tr>
                    <th className="p-2">Produk</th>
                    <th className="p-2">Harga</th>
                    <th className="p-2">Sisa Bisa Retur</th>
                    <th className="p-2">Qty Retur</th>
                    <th className="p-2">Kondisi</th>
                    <th className="p-2">Restock</th>
                    <th className="p-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((line) => (
                    <tr key={line.sale_item_id} className="border-t border-border">
                      <td className="p-2">{line.product_name}</td>
                      <td className="p-2"><Money amount={line.unit_price} size="sm" /></td>
                      <td className="p-2 tabular-nums">{line.qty_returnable} {line.unit_code}</td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min={0}
                          max={line.qty_returnable}
                          step="0.001"
                          className="w-24"
                          value={line.qty}
                          onChange={(e) => {
                            const raw = Number(e.target.value) || 0
                            const qty = Math.max(0, Math.min(raw, line.qty_returnable))
                            updateCartLine(line.sale_item_id, { qty })
                          }}
                        />
                      </td>
                      <td className="p-2">
                        <Select
                          value={line.condition}
                          onValueChange={(v) => updateCartLine(line.sale_item_id, { condition: v as CartItem['condition'], restock: v === 'good' })}
                        >
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="good">Baik</SelectItem>
                            <SelectItem value="damaged">Rusak</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Checkbox
                          checked={line.condition === 'good' && line.restock}
                          disabled={line.condition === 'damaged'}
                          onCheckedChange={(v) => updateCartLine(line.sale_item_id, { restock: Boolean(v) })}
                        />
                      </td>
                      <td className="p-2 text-right"><Money amount={line.qty * line.unit_net_value} size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Alasan Retur</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(REASON_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Detail Alasan (opsional)</Label>
                <Textarea value={reasonDetail} onChange={(e) => setReasonDetail(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md bg-bg p-3">
              <span className="font-medium">Total Retur</span>
              <Money amount={refundTotal} size="lg" />
            </div>

            <Button type="button" variant="outline" onClick={() => void refreshPreview()} disabled={refundTotal <= 0 || previewLoading}>
              {previewLoading ? 'Menghitung…' : 'Hitung Preview Refund'}
            </Button>

            {preview && (
              <div className="flex flex-col gap-2 rounded-md border border-border p-3">
                <p className="text-sm font-medium">Preview Refund (ADR-0007)</p>
                {!preview.cash_allowed && (
                  <p className="rounded-md bg-warning/10 p-2 text-xs text-warning">
                    Sesi kasir asal nota ini sudah ditutup — refund tunai tidak tersedia, dialihkan ke deposit/transfer.
                  </p>
                )}
                <div className="flex flex-col divide-y divide-border">
                  {preview.lines.map((line) => (
                    <div key={line.sale_payment_id} className="flex flex-col gap-1.5 py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{line.method_name}</span>
                        <Money amount={line.allocated} size="sm" />
                      </div>
                      {line.allowed_targets.length > 1 ? (
                        <Select
                          value={refundTargets[line.sale_payment_id] ?? line.default_target}
                          onValueChange={(v) => setRefundTargets((prev) => ({ ...prev, [line.sale_payment_id]: v }))}
                        >
                          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {line.allowed_targets.map((t) => (
                              <SelectItem key={t} value={t}>{TARGET_LABELS[t] ?? t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="w-fit">{TARGET_LABELS[line.default_target] ?? line.default_target}</Badge>
                      )}
                      {line.note && <p className="text-xs text-content-muted">{line.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {submitError && <p className="text-sm text-danger">{submitError}</p>}

            <Button onClick={submit} disabled={submitting || selectedItems().length === 0}>
              Proses Retur
            </Button>
          </CardContent>
        </Card>
      )}

      <SupervisorPinDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        permission="sale_return.approve"
        title="Otorisasi Retur"
        description="Retur memerlukan otorisasi supervisor — masukkan PIN."
        onApproved={(token) => {
          setApprovalToken(token)
          setPinOpen(false)
          doSubmit(token)
        }}
      />
    </div>
  )
}

Create.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
