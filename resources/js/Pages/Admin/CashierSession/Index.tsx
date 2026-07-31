import { useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm } from '@inertiajs/react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { DataTable } from '@/Components/common/DataTable'
import { Money } from '@/Components/common/Money'
import { MoneyInput } from '@/Components/common/MoneyInput'
import { SupervisorPinDialog } from '@/Components/common/SupervisorPinDialog'
import { Button } from '@/Components/ui/button'
import { Label } from '@/Components/ui/label'
import { Textarea } from '@/Components/ui/textarea'
import { Badge } from '@/Components/ui/badge'
import { Card, CardContent } from '@/Components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import type { Paginated } from '@/Types'

type Ref = { id: number; name: string }

type ActiveSession = {
  id: number
  reference: string
  opened_at: string
  opening_cash: number
  total_sales_cash: number
  total_sales_deposit: number
  total_sales_noncash: number
  total_topup_cash: number
  total_receivable_cash: number
  total_cash_in: number
  total_cash_out: number
  total_drop: number
  total_refund_cash: number
  cash_account: Ref
}

type SessionRow = {
  id: number
  reference: string
  opened_at: string
  closed_at: string | null
  opening_cash: number
  expected_cash: number
  actual_cash: number | null
  difference: number | null
  status: string
}

type ActiveSaleRow = {
  id: number
  reference: string
  sale_date: string
  grand_total: number
  status: string
  voided_at: string | null
}

type CashierSessionIndexProps = {
  active: ActiveSession | null
  expected: number | null
  cashAccounts: Ref[]
  activeSales: ActiveSaleRow[]
  recentSessions: SessionRow[] | Paginated<SessionRow>
}

const STATUS_LABELS: Record<string, string> = { open: 'Terbuka', closed: 'Ditutup', force_closed: 'Ditutup Paksa' }
const STATUS_BADGE: Record<string, string> = {
  open: 'bg-success text-white',
  closed: 'bg-slate-500 text-white',
  force_closed: 'bg-danger text-white',
}

const SALE_STATUS_LABELS: Record<string, string> = { completed: 'Selesai', void: 'Dibatalkan' }
const SALE_STATUS_BADGE: Record<string, string> = {
  completed: 'bg-success text-white',
  void: 'bg-danger text-white',
}

export default function Index({ active, expected, cashAccounts, activeSales, recentSessions }: CashierSessionIndexProps) {
  const [pinOpen, setPinOpen] = useState(false)
  const openForm = useForm({ cash_account_id: cashAccounts[0] ? String(cashAccounts[0].id) : '', opening_cash: 0 })
  // Sengaja default ke 0, bukan expected — kasir wajib menghitung fisik
  // uang di laci sungguhan, bukan sekadar menerima angka sistem.
  const closeForm = useForm({ actual_cash: 0, reason: '', approver_id: null as number | null })

  const [voidTarget, setVoidTarget] = useState<ActiveSaleRow | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [voidPinOpen, setVoidPinOpen] = useState(false)
  const [voiding, setVoiding] = useState(false)

  function submitVoid(approverId: number) {
    if (!voidTarget) return

    setVoiding(true)

    router.put(
      route('pos.sales.void', voidTarget.id),
      { reason: voidReason, approver_id: approverId },
      {
        preserveScroll: true,
        onSuccess: () => {
          setVoidTarget(null)
          setVoidReason('')
        },
        onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Gagal membatalkan nota.'),
        onFinish: () => setVoiding(false),
      },
    )
  }

  function confirmVoidReason() {
    if (!voidTarget || voidReason.trim().length < 5) return
    setVoidPinOpen(true)
  }

  const submitOpen: FormEventHandler = (e) => {
    e.preventDefault()
    openForm.post(route('admin.cashier-session.open'), { preserveScroll: true })
  }

  const difference = active ? closeForm.data.actual_cash - (expected ?? 0) : 0
  const toleranceAmount = Math.round(Math.abs(expected ?? 0) * 0.005)
  const needsApproval = Math.abs(difference) > toleranceAmount

  function doSubmitClose(approverId: number | null) {
    if (!active) return

    closeForm.transform((data) => ({ ...data, approver_id: approverId }))
    closeForm.put(route('admin.cashier-session.close', active.id), { preserveScroll: true })
  }

  const submitClose: FormEventHandler = (e) => {
    e.preventDefault()

    if (needsApproval && !closeForm.data.approver_id) {
      setPinOpen(true)
      return
    }

    doSubmitClose(closeForm.data.approver_id)
  }

  const sessions = Array.isArray(recentSessions) ? recentSessions : recentSessions.data

  const saleColumns: ColumnDef<ActiveSaleRow, unknown>[] = [
    { accessorKey: 'reference', header: 'Referensi' },
    { id: 'date', header: 'Waktu', cell: ({ row }) => new Date(row.original.sale_date).toLocaleString('id-ID') },
    { id: 'total', header: 'Total', cell: ({ row }) => <Money amount={row.original.grand_total} size="sm" /> },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge className={SALE_STATUS_BADGE[row.original.status] ?? ''}>{SALE_STATUS_LABELS[row.original.status] ?? row.original.status}</Badge>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        row.original.status === 'completed' ? (
          <Button size="sm" variant="outline" className="text-danger" onClick={() => { setVoidTarget(row.original); setVoidReason('') }}>
            Void
          </Button>
        ) : null
      ),
    },
  ]

  const columns: ColumnDef<SessionRow, unknown>[] = [
    { accessorKey: 'reference', header: 'Referensi' },
    { id: 'opened', header: 'Dibuka', cell: ({ row }) => new Date(row.original.opened_at).toLocaleString('id-ID') },
    { id: 'expected', header: 'Expected', cell: ({ row }) => <Money amount={row.original.expected_cash} size="sm" /> },
    { id: 'actual', header: 'Aktual', cell: ({ row }) => (row.original.actual_cash !== null ? <Money amount={row.original.actual_cash} size="sm" /> : '—') },
    { id: 'diff', header: 'Selisih', cell: ({ row }) => (row.original.difference !== null ? <Money amount={row.original.difference} size="sm" showSign /> : '—') },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge className={STATUS_BADGE[row.original.status] ?? ''}>{STATUS_LABELS[row.original.status] ?? row.original.status}</Badge>,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Sesi Kasir" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Sesi Kasir' }]} />

      {!active ? (
        <Card className="max-w-md">
          <CardContent className="flex flex-col gap-4 p-4">
            <p className="font-medium">Buka Sesi Kasir</p>
            <form onSubmit={submitOpen} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label>Laci Kasir</Label>
                <Select value={openForm.data.cash_account_id} onValueChange={(v) => openForm.setData('cash_account_id', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih laci" />
                  </SelectTrigger>
                  <SelectContent>
                    {cashAccounts.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {openForm.errors.cash_account_id && <p className="text-sm text-danger">{openForm.errors.cash_account_id}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Modal Awal</Label>
                <MoneyInput value={openForm.data.opening_cash} onChange={(v) => openForm.setData('opening_cash', v)} />
              </div>
              <Button type="submit" disabled={openForm.processing}>Buka Sesi</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="flex flex-col gap-2 p-4">
              <p className="font-medium">Rincian Sesi — {active.reference}</p>
              <p className="text-xs text-content-muted">{active.cash_account.name} · dibuka {new Date(active.opened_at).toLocaleString('id-ID')}</p>
              <div className="mt-2 flex flex-col divide-y divide-border text-sm">
                {[
                  ['Modal Awal', active.opening_cash],
                  ['Penjualan Tunai', active.total_sales_cash],
                  ['Penjualan Saldo', active.total_sales_deposit],
                  ['Penjualan Non-tunai', active.total_sales_noncash],
                  ['Top-Up Tunai', active.total_topup_cash],
                  ['Pelunasan Piutang Tunai', active.total_receivable_cash],
                  ['Kas Masuk', active.total_cash_in],
                  ['Kas Keluar', -active.total_cash_out],
                  ['Drop Cash', -active.total_drop],
                  ['Refund Tunai', -active.total_refund_cash],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between py-1.5">
                    <span className="text-content-muted">{label}</span>
                    <Money amount={value as number} size="sm" />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between border-t border-border pt-2">
                <span className="font-medium">Expected Cash</span>
                <Money amount={expected ?? 0} size="lg" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4 p-4">
              <p className="font-medium">Tutup Sesi</p>
              <form onSubmit={submitClose} className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <Label>Uang Fisik di Laci</Label>
                  <MoneyInput value={closeForm.data.actual_cash} onChange={(v) => closeForm.setData('actual_cash', v)} />
                  {closeForm.errors.actual_cash && <p className="text-sm text-danger">{closeForm.errors.actual_cash}</p>}
                </div>
                <div className={`rounded-md border p-3 text-center ${difference === 0 ? 'border-success bg-success/10' : difference < 0 ? 'border-danger bg-danger/10' : 'border-warning bg-warning/10'}`}>
                  <p className="text-xs text-content-muted">Selisih (Aktual − Expected)</p>
                  <Money amount={difference} size="lg" showSign />
                </div>
                {needsApproval && (
                  <div className="space-y-1.5">
                    <Label>Alasan Selisih (wajib)</Label>
                    <Textarea value={closeForm.data.reason} onChange={(e) => closeForm.setData('reason', e.target.value)} />
                    {closeForm.data.approver_id ? (
                      <p className="text-sm text-success">Disetujui oleh supervisor (#{closeForm.data.approver_id}).</p>
                    ) : (
                      <p className="text-sm text-warning">Selisih di atas toleransi — perlu otorisasi supervisor saat simpan.</p>
                    )}
                  </div>
                )}
                <Button type="submit" disabled={closeForm.processing || (needsApproval && !closeForm.data.reason)}>
                  Tutup Sesi
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {active && (
        <div>
          <p className="mb-2 font-medium">Nota Sesi Ini</p>
          <DataTable columns={saleColumns} data={activeSales} getRowId={(row) => String(row.id)} emptyDescription="Belum ada nota pada sesi ini." />
        </div>
      )}

      <div>
        <p className="mb-2 font-medium">Riwayat Sesi</p>
        <DataTable columns={columns} data={sessions} getRowId={(row) => String(row.id)} emptyDescription="Belum ada riwayat sesi." />
      </div>

      <SupervisorPinDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        permission="pos.approve"
        title="Otorisasi Selisih Kas"
        description="Selisih melebihi batas toleransi — masukkan PIN supervisor."
        onApproved={(approverId) => {
          closeForm.setData('approver_id', approverId)
          setPinOpen(false)
          doSubmitClose(approverId)
        }}
      />

      <Dialog open={voidTarget !== null} onOpenChange={(open) => !open && setVoidTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan Nota — {voidTarget?.reference}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-1">
            <div className="space-y-1.5">
              <Label>Alasan Pembatalan (wajib, min. 5 karakter)</Label>
              <Textarea value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
            </div>
            <p className="text-xs text-content-muted">Pembatalan nota memerlukan otorisasi PIN supervisor.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidTarget(null)}>Batal</Button>
            <Button className="bg-danger text-white hover:bg-danger/90" onClick={confirmVoidReason} disabled={voidReason.trim().length < 5 || voiding}>
              Lanjutkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SupervisorPinDialog
        open={voidPinOpen}
        onOpenChange={setVoidPinOpen}
        permission="sale.void"
        title="Otorisasi Void Nota"
        description="Masukkan PIN supervisor untuk membatalkan nota ini."
        onApproved={(approverId) => {
          setVoidPinOpen(false)
          submitVoid(approverId)
        }}
      />
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
