import { useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm, usePage } from '@inertiajs/react'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import {
  CreditCard,
  Printer,
  Receipt,
  FileText,
  Clock,
  History,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Banknote,
  Search,
  ChevronRight,
  ShieldCheck,
  ArrowRight,
  Wallet,
} from 'lucide-react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { Money } from '@/Components/common/Money'
import { MoneyInput } from '@/Components/common/MoneyInput'
import { StatCard } from '@/Components/common/StatCard'
import { ConfirmDialog } from '@/Components/common/ConfirmDialog'
import { AppSheet } from '@/Components/common/AppSheet'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Badge } from '@/Components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { useMidtransSnap } from '@/Hooks/useMidtransSnap'
import { AGING_BUCKETS, AGING_BUCKET_LABELS } from '@/Lib/aging'
import { formatDate } from '@/Lib/date'
import { formatMoney } from '@/Lib/money'
import type { PageProps, Paginated } from '@/Types'

type Ref = { id: number; name: string }

type ReceivableItem = {
  id: number
  reference: string
  sale_id: number | null
  sale_reference: string | null
  total_amount: number
  paid_amount: number
  remaining_amount: number
  due_date: string | null
  status: string
  created_at: string
}

type PaymentItem = {
  id: number
  reference: string
  payment_date: string
  amount: number
  payment_method: string
  note: string | null
  receivable_reference?: string
  sale_reference?: string
  cash_account_name?: string
  creator_name?: string
  created_at: string
}

type MemberReceivableRow = {
  id: number
  name: string
  member_number: string
  nis: string | null
  type: string
  receivable_limit: number
  total_amount: number
  paid_amount: number
  remaining_amount: number
  active_count: number
  nearest_due_date: string | null
  status: 'unpaid' | 'partial' | 'paid' | 'overdue'
  receivables: ReceivableItem[]
  payments: PaymentItem[]
}

type ReceivablesIndexProps = {
  tab: string
  memberReceivables: {
    data: MemberReceivableRow[]
    current_page: number
    per_page: number
    total: number
    last_page: number
  }
  aging: { receivable: { remaining_amount: number }; bucket: string }[]
  cashAccounts: Ref[]
  filters: { status?: string; type?: string; search?: string }
  midtransClientKey?: string
  midtransIsProduction?: boolean
}

const STATUS_LABELS: Record<string, string> = {
  unpaid: 'Belum Bayar',
  partial: 'Sebagian',
  paid: 'Lunas',
  overdue: 'Lewat JT',
}

const STATUS_BADGE: Record<string, string> = {
  unpaid: 'bg-slate-500 text-white',
  partial: 'bg-amber-500 text-white font-bold',
  paid: 'bg-emerald-600 text-white font-bold',
  overdue: 'bg-rose-600 text-white font-bold animate-pulse',
}

const TYPE_LABELS: Record<string, string> = {
  santri: 'Santri',
  fasilitator: 'Fasilitator',
  staff: 'Staf',
  public: 'Umum',
}

export default function Index({
  tab,
  memberReceivables,
  aging,
  cashAccounts,
  filters,
  midtransClientKey,
  midtransIsProduction,
}: ReceivablesIndexProps) {
  const { auth } = usePage<PageProps>().props
  const canWriteOff = auth.user?.permissions?.includes('receivable.delete') ?? false
  const snap = useMidtransSnap(midtransClientKey ?? null, midtransIsProduction ?? false)

  const [statusFilter, setStatusFilter] = useState(filters.status ?? '')
  const [typeFilter, setTypeFilter] = useState(filters.type ?? '')
  const [searchFilter, setSearchFilter] = useState(filters.search ?? '')

  // Slide-over Drawer Target
  const [selectedMember, setSelectedMember] = useState<MemberReceivableRow | null>(null)
  const [writeOffTarget, setWriteOffTarget] = useState<ReceivableItem | null>(null)

  // Form Pembayaran Cicilan
  const [allocationMode, setAllocationMode] = useState<'fifo' | 'specific'>('fifo')
  const [targetReceivableId, setTargetReceivableId] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'qris'>('cash')
  const [amount, setAmount] = useState<number>(0)
  const [cashAccountId, setCashAccountId] = useState<string>('')
  const [cashierPin, setCashierPin] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function applyFilters(overrides: { status?: string; type?: string; search?: string }) {
    const merged = {
      status: statusFilter,
      type: typeFilter,
      search: searchFilter,
      ...overrides,
    }
    router.get(route('admin.receivables.index'), merged, { preserveState: true, replace: true })
  }

  const agingSummary = aging.reduce<Record<string, number>>((acc, row) => {
    acc[row.bucket] = (acc[row.bucket] ?? 0) + row.receivable.remaining_amount
    return acc
  }, {})

  function openMemberDrawer(member: MemberReceivableRow) {
    setSelectedMember(member)
    setAllocationMode('fifo')
    setTargetReceivableId('')
    setPaymentMethod('cash')
    setAmount(member.remaining_amount)
    setCashAccountId(cashAccounts[0] ? String(cashAccounts[0].id) : '')
    setCashierPin('')
    setNote('')
  }

  function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMember || amount <= 0) return

    if (paymentMethod === 'cash' && !cashierPin) {
      toast.error('PIN Kasir wajib dimasukkan untuk transaksi tunai.')
      return
    }

    // If QRIS/Transfer & Midtrans available, trigger Snap
    if ((paymentMethod === 'qris' || paymentMethod === 'transfer') && window.snap) {
      setIsSubmitting(true)
      fetch(route('admin.receivables.snap', selectedMember.id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
        },
        body: JSON.stringify({
          amount,
          receivable_id: allocationMode === 'specific' && targetReceivableId ? parseInt(targetReceivableId) : null,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.snap_token) {
            snap.pay(data.snap_token, {
              onSuccess: () => {
                toast.success('Pembayaran gateway berhasil!')
                router.reload()
              },
              onPending: () => {
                toast.info('Menunggu penyelesaian pembayaran...')
              },
              onError: () => {
                toast.error('Pembayaran gateway gagal.')
              },
              onClose: () => {
                setIsSubmitting(false)
              },
            })
          } else {
            toast.error(data.message || 'Gagal membuat sesi gateway.')
            setIsSubmitting(false)
          }
        })
        .catch(() => {
          toast.error('Terjadi kesalahan jaringan.')
          setIsSubmitting(false)
        })
      return
    }

    setIsSubmitting(true)
    router.post(
      route('admin.receivables.pay-installment', selectedMember.id),
      {
        amount,
        payment_method: paymentMethod,
        receivable_id: allocationMode === 'specific' && targetReceivableId ? parseInt(targetReceivableId) : null,
        cash_account_id: cashAccountId ? parseInt(cashAccountId) : null,
        cashier_pin: cashierPin,
        note,
      },
      {
        preserveScroll: true,
        onSuccess: (page) => {
          const lastPaymentId = (page.props as any).flash?.last_payment_id
          toast.success('Pembayaran cicilan piutang berhasil dicatat.')
          setCashierPin('')
          setNote('')
          if (lastPaymentId) {
            window.open(route('admin.receivables.payment-receipt-pdf', lastPaymentId), '_blank')
          }
          // Refresh member data in state if available
          const refreshed = memberReceivables.data.find((m) => m.id === selectedMember.id)
          if (refreshed) {
            setSelectedMember(refreshed)
            setAmount(refreshed.remaining_amount)
          }
        },
        onError: (errs) => {
          toast.error(Object.values(errs)[0] ?? 'Gagal memproses pembayaran.')
        },
        onFinish: () => setIsSubmitting(false),
      }
    )
  }

  function confirmWriteOff() {
    if (!writeOffTarget) return

    router.delete(route('admin.receivables.write-off', writeOffTarget.id), {
      preserveScroll: true,
      onSuccess: () => {
        toast.success(`Piutang ${writeOffTarget.reference} dihapus (write-off).`)
        setWriteOffTarget(null)
      },
      onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Gagal menghapus piutang.'),
    })
  }

  const columns: ColumnDef<MemberReceivableRow, unknown>[] = [
    {
      id: 'member',
      header: 'Anggota & Tipe',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold text-navy-950 dark:text-white text-sm">{row.original.name}</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
            <span>{row.original.member_number || row.original.nis || '-'}</span>
            <span>•</span>
            <Badge variant="outline" className="text-[10px] uppercase font-sans">
              {TYPE_LABELS[row.original.type] ?? row.original.type}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      id: 'limit',
      header: 'Plafon Limit',
      cell: ({ row }) => <Money amount={row.original.receivable_limit} size="sm" />,
    },
    {
      id: 'total',
      header: 'Total Tagihan',
      cell: ({ row }) => <Money amount={row.original.total_amount} size="sm" />,
    },
    {
      id: 'paid',
      header: 'Sudah Dicicil',
      cell: ({ row }) => (
        <span className="text-emerald-600 font-mono text-sm font-semibold">
          {formatMoney(row.original.paid_amount)}
        </span>
      ),
    },
    {
      id: 'remaining',
      header: 'Sisa Piutang',
      cell: ({ row }) => (
        <span className="text-rose-600 font-mono text-base font-bold">
          {formatMoney(row.original.remaining_amount)}
        </span>
      ),
    },
    {
      id: 'faktur',
      header: 'Faktur Aktif',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
          {row.original.active_count} Nota
        </span>
      ),
    },
    {
      id: 'due',
      header: 'Jatuh Tempo',
      cell: ({ row }) => (
        <span className="text-xs font-mono text-slate-600">
          {row.original.nearest_due_date ? formatDate(row.original.nearest_due_date) : '—'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={STATUS_BADGE[row.original.status] ?? ''}>
          {STATUS_LABELS[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          size="sm"
          onClick={() => openMemberDrawer(row.original)}
          className="bg-navy-900 hover:bg-navy-950 text-white font-bold text-xs gap-1 h-8 shadow-sm"
        >
          Kelola Piutang
          <ChevronRight className="size-3.5" />
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Piutang Anggota"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Piutang' }]}
      />
      <PageTabs
        current={tab}
        tabs={[
          { key: 'debts', label: 'Hutang Supplier', href: route('admin.debts.index'), permission: 'debt.view' },
          { key: 'receivables', label: 'Piutang Anggota', href: route('admin.receivables.index'), permission: 'receivable.view' },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {AGING_BUCKETS.map((bucket) => (
          <StatCard
            key={bucket}
            label={AGING_BUCKET_LABELS[bucket]}
            value={new Intl.NumberFormat('id-ID').format(agingSummary[bucket] ?? 0)}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Cari nama / NIS..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyFilters({ search: searchFilter })
              }}
              className="pl-9 w-60 text-xs h-9"
            />
          </div>

          <Select
            value={typeFilter || 'all'}
            onValueChange={(v) => {
              const next = v === 'all' ? '' : v
              setTypeFilter(next)
              applyFilters({ type: next })
            }}
          >
            <SelectTrigger className="w-36 text-xs h-9">
              <SelectValue placeholder="Semua Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="fasilitator">Fasilitator</SelectItem>
              <SelectItem value="staff">Staf</SelectItem>
              <SelectItem value="public">Umum</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter || 'all'}
            onValueChange={(v) => {
              const next = v === 'all' ? '' : v
              setStatusFilter(next)
              applyFilters({ status: next })
            }}
          >
            <SelectTrigger className="w-40 text-xs h-9">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              <SelectItem value="overdue">Lewat Jatuh Tempo</SelectItem>
              <SelectItem value="partial">Sebagian</SelectItem>
              <SelectItem value="unpaid">Belum Bayar</SelectItem>
              <SelectItem value="paid">Lunas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={memberReceivables.data}
        getRowId={(row) => String(row.id)}
        pagination={{
          page: memberReceivables.current_page,
          perPage: memberReceivables.per_page,
          total: memberReceivables.total,
          onPageChange: (page) =>
            router.get(
              route('admin.receivables.index'),
              { status: statusFilter, type: typeFilter, search: searchFilter, page },
              { preserveState: true }
            ),
        }}
      />

      {/* ─── SLIDE-OVER SHEET KANAN (DRAWER KELOLA PIUTANG) ─── */}
      <AppSheet
        open={selectedMember !== null}
        onOpenChange={(open) => !open && setSelectedMember(null)}
        title={`Kelola Piutang: ${selectedMember?.name ?? ''}`}
        description={`${selectedMember?.member_number ?? selectedMember?.nis ?? ''} · Tipe: ${
          TYPE_LABELS[selectedMember?.type ?? ''] ?? selectedMember?.type ?? ''
        }`}
        size="lg"
      >
        {selectedMember && (
          <div className="flex flex-col gap-6">
            {/* Header Ringkasan Keuangan */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">Plafon Limit</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-200 text-sm">
                  {formatMoney(selectedMember.receivable_limit)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Sisa Piutang</span>
                <span className="font-bold font-mono text-rose-600 text-sm">
                  {formatMoney(selectedMember.remaining_amount)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Sisa Plafon</span>
                <span className="font-bold font-mono text-emerald-600 text-sm">
                  {formatMoney(Math.max(0, selectedMember.receivable_limit - selectedMember.remaining_amount))}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Jatuh Tempo</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-200 text-sm">
                  {selectedMember.nearest_due_date ? formatDate(selectedMember.nearest_due_date) : '—'}
                </span>
              </div>
            </div>

            {/* Form Pembayaran Cicilan / Pelunasan */}
            {selectedMember.remaining_amount > 0 && (
              <form
                onSubmit={handlePaymentSubmit}
                className="rounded-2xl border-2 border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/20 p-4 space-y-4 shadow-sm"
              >
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold text-sm">
                  <Banknote className="size-4 text-emerald-600" />
                  Formulir Pembayaran Cicilan / Pelunasan
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Alokasi Pembayaran</Label>
                    <Select
                      value={allocationMode}
                      onValueChange={(v: 'fifo' | 'specific') => setAllocationMode(v)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fifo">Otomatis Nota Tertua (FIFO)</SelectItem>
                        <SelectItem value="specific">Pilih Faktur Khusus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {allocationMode === 'specific' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Pilih Faktur</Label>
                      <Select value={targetReceivableId} onValueChange={setTargetReceivableId}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Pilih faktur..." />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedMember.receivables
                            .filter((r) => r.remaining_amount > 0)
                            .map((r) => (
                              <SelectItem key={r.id} value={String(r.id)}>
                                {r.sale_reference || r.reference} (Sisa: {formatMoney(r.remaining_amount)})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs">Nominal Cicilan (Rp)</Label>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAmount(selectedMember.remaining_amount)}
                        className="text-[11px] font-bold text-emerald-700 hover:underline"
                      >
                        Lunasi Semua ({formatMoney(selectedMember.remaining_amount)})
                      </button>
                    </div>
                  </div>
                  <MoneyInput value={amount} onChange={setAmount} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Metode Pembayaran</Label>
                    <Select
                      value={paymentMethod}
                      onValueChange={(v: 'cash' | 'transfer' | 'qris') => setPaymentMethod(v)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">💵 Tunai di Kasir</SelectItem>
                        <SelectItem value="qris">📲 QRIS (Payment Gateway)</SelectItem>
                        <SelectItem value="transfer">🏦 Transfer Bank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {paymentMethod === 'cash' ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1 text-rose-700 font-bold">
                        <ShieldCheck className="size-3.5" />
                        PIN Kasir Bertugas (Wajib)
                      </Label>
                      <Input
                        type="password"
                        maxLength={10}
                        placeholder="Masukkan PIN Anda"
                        value={cashierPin}
                        onChange={(e) => setCashierPin(e.target.value)}
                        className="h-9 text-xs font-mono font-bold"
                        required
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Akun Kas / Bank (Opsional)</Label>
                      <Select value={cashAccountId} onValueChange={setCashAccountId}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Pilih akun..." />
                        </SelectTrigger>
                        <SelectContent>
                          {cashAccounts.map((a) => (
                            <SelectItem key={a.id} value={String(a.id)}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Catatan Pembayaran (Opsional)</Label>
                  <Input
                    placeholder="Misal: Cicilan ke-1 titipan wali/orang tua..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || amount <= 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 shadow-md gap-2"
                >
                  {isSubmitting ? 'Memproses…' : `Proses Pembayaran (${formatMoney(amount)})`}
                  <ArrowRight className="size-4" />
                </Button>
              </form>
            )}

            {/* Rincian Nota Piutang & Riwayat Termin */}
            <Tabs defaultValue="faktur" className="w-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="faktur" className="text-xs font-bold gap-1.5">
                  <FileText className="size-3.5" />
                  Daftar Faktur / Nota ({selectedMember.receivables.length})
                </TabsTrigger>
                <TabsTrigger value="termin" className="text-xs font-bold gap-1.5">
                  <History className="size-3.5" />
                  Riwayat Termin & Cicilan ({selectedMember.payments.length})
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: Daftar Faktur */}
              <TabsContent value="faktur" className="pt-3">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                      <tr>
                        <th className="p-2.5">No. Nota / Ref</th>
                        <th className="p-2.5">Jatuh Tempo</th>
                        <th className="p-2.5 text-right">Total</th>
                        <th className="p-2.5 text-right">Sisa</th>
                        <th className="p-2.5 text-center">Status</th>
                        <th className="p-2.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {selectedMember.receivables.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          <td className="p-2.5">
                            <span className="font-bold block text-navy-900 dark:text-white">
                              {rec.sale_reference || rec.reference}
                            </span>
                            <span className="text-[10px] text-slate-400 font-sans">
                              Tgl: {formatDate(rec.created_at)}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-600">
                            {rec.due_date ? formatDate(rec.due_date) : '—'}
                          </td>
                          <td className="p-2.5 text-right font-semibold">
                            {formatMoney(rec.total_amount)}
                          </td>
                          <td className="p-2.5 text-right font-bold text-rose-600">
                            {formatMoney(rec.remaining_amount)}
                          </td>
                          <td className="p-2.5 text-center">
                            <Badge className={STATUS_BADGE[rec.status] ?? ''}>
                              {STATUS_LABELS[rec.status] ?? rec.status}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-right">
                            {canWriteOff && rec.status !== 'paid' && (
                              <Button
                                size="xs"
                                variant="ghost"
                                className="text-rose-600 hover:bg-rose-50 h-7 text-[11px]"
                                onClick={() => setWriteOffTarget(rec)}
                              >
                                Write-Off
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* TAB 2: Riwayat Termin Pembayaran */}
              <TabsContent value="termin" className="pt-3">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
                      <tr>
                        <th className="p-2.5">Kuitansi No</th>
                        <th className="p-2.5">Tanggal</th>
                        <th className="p-2.5">Metode</th>
                        <th className="p-2.5 text-right">Nominal</th>
                        <th className="p-2.5">Petugas</th>
                        <th className="p-2.5 text-right">Cetak</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {selectedMember.payments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-400 font-sans">
                            Belum ada riwayat pembayaran cicilan.
                          </td>
                        </tr>
                      ) : (
                        selectedMember.payments.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                            <td className="p-2.5 font-bold text-navy-900 dark:text-white">
                              {p.reference}
                            </td>
                            <td className="p-2.5 text-slate-600">
                              {formatDate(p.payment_date || p.created_at)}
                            </td>
                            <td className="p-2.5 font-sans">
                              <Badge variant="outline" className="uppercase text-[10px]">
                                {p.payment_method}
                              </Badge>
                            </td>
                            <td className="p-2.5 text-right font-bold text-emerald-600">
                              {formatMoney(p.amount)}
                            </td>
                            <td className="p-2.5 text-slate-600 font-sans">
                              {p.creator_name || 'Kasir'}
                            </td>
                            <td className="p-2.5 text-right">
                              <Button
                                size="xs"
                                variant="outline"
                                className="h-7 text-xs gap-1 font-sans"
                                onClick={() =>
                                  window.open(
                                    route('admin.receivables.payment-receipt-pdf', p.id),
                                    '_blank'
                                  )
                                }
                              >
                                <Printer className="size-3" />
                                Struk
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </AppSheet>

      {/* Confirm Write Off */}
      <ConfirmDialog
        open={writeOffTarget !== null}
        onOpenChange={(open) => !open && setWriteOffTarget(null)}
        title="Hapus Piutang (Write-Off)"
        description={`Piutang ${writeOffTarget?.reference} sebesar ${formatMoney(
          writeOffTarget?.remaining_amount ?? 0
        )} akan dihapus permanen (write-off) dan dianggap tidak tertagih. Tindakan ini hanya untuk piutang yang sudah lewat jatuh tempo lebih dari 90 hari.`}
        confirmLabel="Ya, Hapus Piutang"
        variant="destructive"
        onConfirm={confirmWriteOff}
      />
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
