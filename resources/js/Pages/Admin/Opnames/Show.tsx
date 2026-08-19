import { useMemo, useState, type ReactElement } from 'react'
import { router } from '@inertiajs/react'
import { toast } from 'sonner'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { Money } from '@/Components/common/Money'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Badge } from '@/Components/ui/badge'
import { Card, CardContent } from '@/Components/ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/Components/ui/alert-dialog'
import { apiPost } from '@/Lib/api'
import { formatDate } from '@/Lib/date'

type Ref = { id: number; name: string } | null

type OpnameItem = {
  id: number
  product: { id: number; name: string; sku: string }
  system_qty: string
  physical_qty: string | null
  variance_qty: string
  unit_cost: number
  variance_value: number
  variance_reason: string | null
  counted_at: string | null
}

type OpnameDetail = {
  id: number
  reference: string
  opname_date: string
  status: string
  scope: string
  total_items: number
  counted_items: number
  total_variance_value: number
  variance_percent: string
  note: string | null
  outlet: { id: number; name: string }
  starter: Ref
  reviewer: Ref
  approver: Ref
  poster: Ref
  items: OpnameItem[]
}

type OpnameShowProps = {
  opname: OpnameDetail
  canApproveVariance: boolean
  tolerancePercent: number
}

const STATUS_LABELS: Record<string, string> = {
  counting: 'Menghitung', review: 'Tinjau Selisih', approved: 'Disetujui', posted: 'Diposting', cancelled: 'Dibatalkan',
}
const STATUS_BADGE: Record<string, string> = {
  counting: 'bg-navy-600 text-white',
  review: 'bg-warning text-white',
  approved: 'bg-teal-600 text-white',
  posted: 'bg-success text-white',
  cancelled: 'bg-danger text-white',
}

export default function Show({ opname, canApproveVariance, tolerancePercent }: OpnameShowProps) {
  const [barcode, setBarcode] = useState('')
  const [scanError, setScanError] = useState<string | null>(null)
  const [localQty, setLocalQty] = useState<Record<number, number>>({})

  const isCounting = opname.status === 'counting'
  const isReview = opname.status === 'review'
  const varianceExceedsTolerance = Math.abs(Number(opname.variance_percent)) > tolerancePercent

  async function submitScan(code: string) {
    if (!code.trim()) return
    setScanError(null)

    try {
      const res = await apiPost<{ item: { id: number; product_id: number; physical_qty: string | null } }>(
        route('admin.opnames.scan', opname.id),
        { barcode: code }
      )
      const currentQty = localQty[res.item.product_id] ?? Number(res.item.physical_qty ?? 0)
      void submitCount(res.item.product_id, currentQty + 1)
    } catch (err: any) {
      setScanError(err.message ?? 'Barcode tidak dikenali.')
    } finally {
      setBarcode('')
    }
  }

  async function submitCount(productId: number, physicalQty: number) {
    try {
      await apiPost(route('admin.opnames.count', opname.id), { product_id: productId, physical_qty: physicalQty })
      setLocalQty((prev) => ({ ...prev, [productId]: physicalQty }))
      router.reload({ only: ['opname'] })
    } catch (err: any) {
      toast.error(err.message ?? 'Gagal mencatat hitungan.')
    }
  }

  function finishCounting() {
    router.put(route('admin.opnames.finish-counting', opname.id), {}, {
      onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Gagal menyelesaikan hitung.'),
    })
  }

  function updateReason(productId: number, reason: string) {
    router.put(route('admin.opnames.reason', opname.id), { product_id: productId, variance_reason: reason }, {
      preserveScroll: true,
      preserveState: true,
    })
  }

  function approveOpname() {
    router.put(route('admin.opnames.approve', opname.id), {}, {
      onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Gagal menyetujui opname.'),
    })
  }

  function postOpname() {
    router.put(route('admin.opnames.post', opname.id), {}, {
      onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Gagal memposting opname.'),
    })
  }

  function cancelOpname() {
    router.put(route('admin.opnames.cancel', opname.id), {}, {
      onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Gagal membatalkan opname.'),
    })
  }

  const progressPercent = useMemo(() => (opname.total_items > 0 ? Math.round((opname.counted_items / opname.total_items) * 100) : 0), [opname.counted_items, opname.total_items])

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`Opname ${opname.reference}`}
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Stock Opname', href: '/admin/opnames' }, { label: opname.reference }]}
        actions={<Badge className={STATUS_BADGE[opname.status] ?? ''}>{STATUS_LABELS[opname.status] ?? opname.status}</Badge>}
      />

      <Card>
        <CardContent className="grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-4">
          <div><p className="text-content-muted">Outlet</p><p className="font-medium">{opname.outlet.name}</p></div>
          <div><p className="text-content-muted">Tanggal</p><p className="font-medium">{formatDate(opname.opname_date)}</p></div>
          <div><p className="text-content-muted">Dimulai Oleh</p><p className="font-medium">{opname.starter?.name ?? '—'}</p></div>
          <div><p className="text-content-muted">Progres</p><p className="font-medium">{opname.counted_items} dari {opname.total_items} item</p></div>
        </CardContent>
      </Card>

      {isCounting && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            <p className="font-medium">Hitung Fisik — Blind Count</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-bg">
              <div className="h-full bg-navy-600 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            <Input
              autoFocus
              placeholder="Scan barcode… (menambah 1 setiap scan)"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submitScan(barcode) } }}
            />
            {scanError && <p className="text-sm text-danger">{scanError}</p>}

            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface text-left text-content-muted">
                  <tr>
                    <th className="p-2 w-12 text-center">No</th>
                    <th className="p-2">Produk</th>
                    <th className="p-2">SKU</th>
                    <th className="p-2">Qty Fisik</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {opname.items.map((item, index) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="p-2 text-center text-content-muted font-medium">{index + 1}</td>
                      <td className="p-2">{item.product.name}</td>
                      <td className="p-2 text-content-muted">{item.product.sku}</td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.001"
                          className="w-24"
                          value={localQty[item.product.id] ?? item.physical_qty ?? item.system_qty}
                          onChange={(e) => setLocalQty((prev) => ({ ...prev, [item.product.id]: Number(e.target.value) || 0 }))}
                          onBlur={(e) => { const v = localQty[item.product.id] ?? (e.target.value !== '' ? Number(e.target.value) : Number(item.system_qty)); submitCount(item.product.id, v) }}
                        />
                      </td>
                      <td className="p-2">
                        {item.counted_at ? <Badge className="bg-success text-white">Dihitung</Badge> : <Badge variant="outline">Belum</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button onClick={finishCounting} disabled={opname.counted_items < opname.total_items}>
              Selesai Hitung ({opname.counted_items}/{opname.total_items})
            </Button>
          </CardContent>
        </Card>
      )}

      {(isReview || opname.status === 'approved' || opname.status === 'posted') && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            <p className="font-medium">Tinjau Selisih</p>
            <div className="flex flex-wrap gap-4 rounded-md bg-bg p-3 text-sm">
              <div><span className="text-content-muted">Total Nilai Selisih: </span><Money amount={opname.total_variance_value} size="sm" showSign /></div>
              <div><span className="text-content-muted">Persentase: </span><span className={varianceExceedsTolerance ? 'font-medium text-danger' : 'font-medium text-success'}>{Number(opname.variance_percent).toFixed(2)}%</span></div>
              <div><span className="text-content-muted">Toleransi: </span>{tolerancePercent}%</div>
            </div>
            {varianceExceedsTolerance && (
              <p className="rounded-md bg-warning/10 p-2 text-xs text-warning">
                Selisih melebihi toleransi — persetujuan wajib dilakukan oleh owner{canApproveVariance ? ' (Anda berwenang).' : '.'}
              </p>
            )}

            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface text-left text-content-muted">
                  <tr>
                    <th className="p-2 w-12 text-center">No</th>
                    <th className="p-2">Produk</th>
                    <th className="p-2">Sistem</th>
                    <th className="p-2">Fisik</th>
                    <th className="p-2">Selisih</th>
                    <th className="p-2">Nilai</th>
                    <th className="p-2">Alasan</th>
                  </tr>
                </thead>
                <tbody>
                  {opname.items.map((item, index) => {
                    const variance = Number(item.variance_qty)
                    const itemPercent = Number(item.system_qty) > 0 ? Math.abs(variance) / Number(item.system_qty) * 100 : (variance !== 0 ? 100 : 0)
                    const needsReason = itemPercent > tolerancePercent && variance !== 0

                    return (
                      <tr key={item.id} className="border-t border-border">
                        <td className="p-2 text-center text-content-muted font-medium">{index + 1}</td>
                        <td className="p-2">{item.product.name}</td>
                        <td className="p-2 tabular-nums">{item.system_qty}</td>
                        <td className="p-2 tabular-nums">{item.physical_qty}</td>
                        <td className={`p-2 tabular-nums font-medium ${variance < 0 ? 'text-danger' : variance > 0 ? 'text-success' : ''}`}>
                          {variance > 0 ? '+' : ''}{item.variance_qty}
                        </td>
                        <td className="p-2"><Money amount={item.variance_value} size="sm" showSign /></td>
                        <td className="p-2">
                          {isReview ? (
                            <Input
                              defaultValue={item.variance_reason ?? ''}
                              placeholder={needsReason ? 'Wajib diisi' : 'Opsional'}
                              className={needsReason && !item.variance_reason ? 'border-danger' : ''}
                              onBlur={(e) => { if (e.target.value !== (item.variance_reason ?? '')) updateReason(item.product.id, e.target.value) }}
                            />
                          ) : (
                            item.variance_reason ?? '—'
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              {isReview && (
                <Button onClick={approveOpname} disabled={varianceExceedsTolerance && !canApproveVariance}>
                  {varianceExceedsTolerance ? 'Setujui (Owner)' : 'Setujui'}
                </Button>
              )}
              {opname.status === 'approved' && <Button onClick={postOpname}>Posting — Sesuaikan Stok</Button>}
            </div>
          </CardContent>
        </Card>
      )}

      {opname.status === 'posted' && (
        <p className="text-sm text-content-muted">
          Diposting oleh {opname.poster?.name ?? '—'} — stok telah disesuaikan dan opname ini tidak bisa diubah lagi.
        </p>
      )}

      {opname.status === 'cancelled' && (
        <p className="text-sm text-content-muted">{opname.note ?? 'Opname ini dibatalkan.'}</p>
      )}

      {(isCounting || isReview) && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-fit text-danger">Batalkan Opname</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Batalkan opname {opname.reference}?</AlertDialogTitle>
              <AlertDialogDescription>
                Seluruh hasil hitung akan dibuang. Stok belum tersentuh sama sekali (belum diposting), jadi ini aman dilakukan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction className="bg-danger text-white hover:bg-danger/90" onClick={() => { cancelOpname() }}>
                Ya, Batalkan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

Show.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
