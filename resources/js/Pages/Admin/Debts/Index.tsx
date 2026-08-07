import { useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertCircle, AlertTriangle, Building2, Calendar, CheckCircle2, Clock, Coins,
  CreditCard, FileText, History, Info, PlusCircle, Receipt, ShieldAlert, User, Wallet,
} from 'lucide-react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { Money } from '@/Components/common/Money'
import { MoneyInput } from '@/Components/common/MoneyInput'
import { StatCard } from '@/Components/common/StatCard'
import { Button } from '@/Components/ui/button'
import { Label } from '@/Components/ui/label'
import { Input } from '@/Components/ui/input'
import { Badge } from '@/Components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { AGING_BUCKETS, AGING_BUCKET_LABELS } from '@/Lib/aging'
import { formatDate } from '@/Lib/date'
import type { Paginated } from '@/Types'
import { cn } from '@/Lib/utils'

type Ref = { id: number; name: string }

type DebtPaymentRow = {
  id: number
  reference: string
  payment_date: string
  amount: number
  ref_no: string | null
  note: string | null
  payment_method: Ref | null
  creator: Ref | null
}

type DebtRow = {
  id: number
  reference: string
  total_amount: number
  paid_amount: number
  remaining_amount: number
  due_date: string
  status: string
  supplier: Ref
  purchase: { id: number; reference: string }
  payments?: DebtPaymentRow[]
}

type DebtsIndexProps = {
  tab: string
  debts: Paginated<DebtRow>
  aging: { debt: DebtRow; bucket: string }[]
  paymentMethods: Ref[]
  filters: { status?: string; supplier_id?: string }
}

const STATUS_LABELS: Record<string, string> = {
  unpaid: 'Belum Bayar',
  partial: 'Sebagian (Termin)',
  paid: 'Lunas',
  overdue: 'Jatuh Tempo',
}

const STATUS_BADGE: Record<string, string> = {
  unpaid: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
  partial: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  paid: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  overdue: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
}

export default function Index({ tab, debts, aging, paymentMethods, filters }: DebtsIndexProps) {
  const [statusFilter, setStatusFilter] = useState(filters.status ?? '')
  const [payTarget, setPayTarget] = useState<DebtRow | null>(null)
  const [historyTarget, setHistoryTarget] = useState<DebtRow | null>(null)
  const form = useForm({ amount: 0, payment_method_id: '', ref_no: '', note: '' })

  function applyFilter(status: string) {
    setStatusFilter(status)
    router.get(route('admin.debts.index'), { status }, { preserveState: true, replace: true })
  }

  const agingSummary = aging.reduce<Record<string, number>>((acc, row) => {
    acc[row.bucket] = (acc[row.bucket] ?? 0) + row.debt.remaining_amount
    return acc
  }, {})

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    if (!payTarget) return

    form.post(route('admin.debts.pay', payTarget.id), {
      preserveScroll: true,
      onSuccess: () => {
        form.reset()
        setPayTarget(null)
      },
    })
  }

  const columns: ColumnDef<DebtRow, unknown>[] = [
    { accessorKey: 'reference', header: 'Referensi' },
    { id: 'supplier', header: 'Supplier', cell: ({ row }) => <span className="font-semibold text-slate-900 dark:text-white">{row.original.supplier.name}</span> },
    { id: 'purchase', header: 'Nota Pembelian', cell: ({ row }) => row.original.purchase?.reference ?? '—' },
    { id: 'due', header: 'Jatuh Tempo', cell: ({ row }) => formatDate(row.original.due_date) },
    { id: 'total', header: 'Total Hutang', cell: ({ row }) => <Money amount={row.original.total_amount} /> },
    { id: 'paid', header: 'Terbayar', cell: ({ row }) => <Money amount={row.original.paid_amount} className="text-emerald-600 font-semibold" /> },
    { id: 'remaining', header: 'Sisa Hutang', cell: ({ row }) => <Money amount={row.original.remaining_amount} className="text-red-600 font-bold" /> },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant="outline" className={STATUS_BADGE[row.original.status] ?? ''}>
          {STATUS_LABELS[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          {/* View Payment History Button */}
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={() => setHistoryTarget(row.original)}
            title="Lihat Riwayat Termin Pembayaran"
          >
            <History className="size-3.5" />
            <span>Riwayat</span>
          </Button>

          {/* Add Installment / Pay Button */}
          {row.original.status !== 'paid' && (
            <Button
              size="sm"
              className="gap-1.5 bg-amber-500 text-navy-950 hover:bg-amber-400 font-bold shadow-xs"
              onClick={() => {
                setPayTarget(row.original)
                form.setData({
                  amount: row.original.remaining_amount,
                  payment_method_id: paymentMethods[0] ? String(paymentMethods[0].id) : '',
                  ref_no: '',
                  note: '',
                })
              }}
            >
              <PlusCircle className="size-3.5" />
              <span>Tambah Termin</span>
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <PageHeader title="Hutang Pemasok" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Hutang' }]} />
      <PageTabs current={tab} tabs={[
        { key: 'debts', label: 'Hutang', href: route('admin.debts.index'), permission: 'debt.view' },
        { key: 'receivables', label: 'Piutang', href: route('admin.receivables.index'), permission: 'receivable.view' },
      ]} />

      {/* Aging Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {AGING_BUCKETS.map((bucket) => (
          <StatCard key={bucket} label={AGING_BUCKET_LABELS[bucket]} value={new Intl.NumberFormat('id-ID').format(agingSummary[bucket] ?? 0)} />
        ))}
      </div>

      {/* Main Table Card */}
      <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400">
                <Building2 className="size-4.5" />
              </div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                Daftar Hutang Pemasok (Cicilan / Termin)
              </CardTitle>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Select value={statusFilter || 'all'} onValueChange={(v) => applyFilter(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-48 h-9 rounded-xl border-slate-200 text-xs font-semibold dark:border-slate-800">
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <DataTable
            columns={columns}
            data={debts.data}
            getRowId={(row) => String(row.id)}
            pagination={{
              page: debts.current_page,
              perPage: debts.per_page,
              total: debts.total,
              onPageChange: (page) => router.get(route('admin.debts.index'), { status: statusFilter, page }, { preserveState: true }),
            }}
          />
        </CardContent>
      </Card>

      {/* Modal Tambah Termin Pembayaran */}
      <Dialog open={payTarget !== null} onOpenChange={(open) => !open && setPayTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <PlusCircle className="size-5 text-amber-500" />
              <DialogTitle>Tambah Termin Pembayaran — {payTarget?.reference}</DialogTitle>
            </div>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 pt-1">
            {/* Info Summary Box */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/40 text-xs flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Pemasok / Supplier:</span>
                <strong className="text-slate-900 dark:text-white font-bold">{payTarget?.supplier?.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Total Hutang Awal:</span>
                <Money amount={payTarget?.total_amount ?? 0} size="sm" />
              </div>
              <div className="flex justify-between border-t border-slate-200/60 pt-1.5 dark:border-slate-700/60 font-bold">
                <span className="text-red-600 dark:text-red-400">Sisa Hutang Belum Lunas:</span>
                <Money amount={payTarget?.remaining_amount ?? 0} size="sm" className="text-red-600 dark:text-red-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Nominal Bayar / Termin (Rp)
              </Label>
              <MoneyInput
                value={form.data.amount}
                onChange={(v) => form.setData('amount', v)}
                className="h-11 rounded-xl text-base font-bold"
              />
              {form.errors.amount && <p className="text-xs text-red-600 font-semibold">{form.errors.amount}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Metode Pembayaran
              </Label>
              <Select value={form.data.payment_method_id} onValueChange={(v) => form.setData('payment_method_id', v)}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 font-semibold dark:border-slate-800">
                  <SelectValue placeholder="Pilih metode pembayaran..." />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((pm) => (
                    <SelectItem key={pm.id} value={String(pm.id)}>{pm.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                No. Bukti / Referensi Bank (Opsional)
              </Label>
              <Input
                value={form.data.ref_no}
                onChange={(e) => form.setData('ref_no', e.target.value)}
                placeholder="Contoh: BUKTI-TRF-12345"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Catatan (Opsional)
              </Label>
              <Input
                value={form.data.note}
                onChange={(e) => form.setData('note', e.target.value)}
                placeholder="Contoh: Cicilan termin ke-2"
                className="h-11 rounded-xl"
              />
            </div>

            <DialogFooter className="mt-2">
              <Button
                type="submit"
                disabled={form.processing}
                className="h-11 gap-2 rounded-xl bg-amber-500 text-navy-950 hover:bg-amber-400 font-bold shadow-md w-full"
              >
                <CheckCircle2 className="size-4" />
                {form.processing ? 'Menyimpan…' : 'Simpan Pembayaran Termin'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Riwayat Termin Pembayaran */}
      <Dialog open={historyTarget !== null} onOpenChange={(open) => !open && setHistoryTarget(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <History className="size-5 text-blue-500" />
              <DialogTitle>Riwayat Termin Pembayaran — {historyTarget?.reference}</DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-4 pt-1">
            {/* Header Info */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-800/40 text-xs">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Supplier: <strong className="text-slate-900 dark:text-white">{historyTarget?.supplier?.name}</strong></p>
                <p className="text-slate-500 dark:text-slate-400">Nota Pembelian: <strong className="text-slate-900 dark:text-white">{historyTarget?.purchase?.reference}</strong></p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 dark:text-slate-400">Total Terbayar:</p>
                <Money amount={historyTarget?.paid_amount ?? 0} size="md" className="font-bold text-emerald-600" />
              </div>
            </div>

            {/* List of Payments */}
            {!historyTarget?.payments || historyTarget.payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-200 rounded-2xl dark:border-slate-800">
                <Clock className="size-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Belum ada termin pembayaran untuk hutang ini.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto pr-1">
                {historyTarget.payments.map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 font-black text-xs">
                        #{historyTarget.payments!.length - idx}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {p.reference}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatDate(p.payment_date)} · {p.payment_method?.name ?? 'Tunai'}
                        </span>
                        {p.ref_no && <span className="text-[10px] text-slate-400 font-mono">Ref: {p.ref_no}</span>}
                        {p.note && <span className="text-[11px] text-slate-500 italic">"{p.note}"</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <Money amount={p.amount} size="md" className="font-extrabold text-emerald-600" />
                      <p className="text-[10px] text-slate-400">Oleh: {p.creator?.name ?? 'Sistem'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setHistoryTarget(null)} className="rounded-xl font-bold">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
