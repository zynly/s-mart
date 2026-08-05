import { useMemo, useRef, useState, type FormEventHandler, type ReactElement } from 'react'
import { router, useForm } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import type { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { formatDateTime } from '@/Lib/date'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { Money } from '@/Components/common/Money'
import { MoneyInput } from '@/Components/common/MoneyInput'
import { DateRangePicker } from '@/Components/common/DateRangePicker'
import { SupervisorPinDialog } from '@/Components/common/SupervisorPinDialog'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Textarea } from '@/Components/ui/textarea'
import { Badge } from '@/Components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { formatMoney } from '@/Lib/money'
import { newIdempotencyKey } from '@/Lib/idempotency'
import type { Paginated } from '@/Types'

type MemberOption = { id: number; name: string; member_number: string; nis: string | null; balance_cache: number }
type PaymentMethodOption = { id: number; name: string; type: string }
type OutletOption = { id: number; name: string }

type TransactionRow = {
  id: number
  reference: string
  type: string
  amount: number
  balance_after: number
  note: string | null
  created_at: string
  member: { id: number; name: string; member_number: string } | null
  payment_method: { id: number; name: string } | null
}

type AdjustmentRow = {
  id: number
  created_at: string
  amount: number
  balance_before: number
  balance_after: number
  note: string | null
  member: { id: number; name: string; member_number: string } | null
  approver: { id: number; name: string } | null
}

type DepositIndexProps = {
  tab: string
  transactions: Paginated<TransactionRow>
  adjustments: Paginated<AdjustmentRow>
  members: MemberOption[]
  paymentMethods: PaymentMethodOption[]
  outlets: OutletOption[]
  filters: { member_id?: string; type?: string; from?: string; to?: string }
  adjustmentFilters: { member_adj?: string; from_adj?: string; to_adj?: string }
  canWithdraw: boolean
  canAdjust: boolean
}

const QUICK_AMOUNTS = [10000, 20000, 50000, 100000]

const TYPE_LABELS: Record<string, string> = {
  topup: 'Top-Up',
  purchase: 'Belanja',
  refund: 'Refund',
  withdrawal: 'Penarikan',
  adjustment: 'Penyesuaian',
  bonus: 'Bonus',
  card_transfer_in: 'Transfer Kartu Masuk',
  card_transfer_out: 'Transfer Kartu Keluar',
  expired: 'Kadaluwarsa',
  closing: 'Tutup Akun',
}

export default function Index({ tab, transactions, adjustments, members, paymentMethods, outlets, filters, adjustmentFilters, canWithdraw, canAdjust }: DepositIndexProps) {
  const [adjMemberFilter, setAdjMemberFilter] = useState(adjustmentFilters.member_adj ?? '')
  const [adjDateRange, setAdjDateRange] = useState<DateRange | undefined>(
    adjustmentFilters.from_adj || adjustmentFilters.to_adj
      ? { from: adjustmentFilters.from_adj ? new Date(adjustmentFilters.from_adj) : undefined, to: adjustmentFilters.to_adj ? new Date(adjustmentFilters.to_adj) : undefined }
      : undefined,
  )

  function applyAdjFilter() {
    router.get(route('admin.deposit.index'), {
      member_adj: adjMemberFilter,
      from_adj: adjDateRange?.from ? format(adjDateRange.from, 'yyyy-MM-dd') : '',
      to_adj: adjDateRange?.to ? format(adjDateRange.to, 'yyyy-MM-dd') : '',
    }, { preserveState: true, replace: true })
  }

  function exportAdjustments() {
    const params = new URLSearchParams({
      member_adj: adjMemberFilter,
      from_adj: adjDateRange?.from ? format(adjDateRange.from, 'yyyy-MM-dd') : '',
      to_adj: adjDateRange?.to ? format(adjDateRange.to, 'yyyy-MM-dd') : '',
    })
    window.open(`${route('admin.deposit.adjustments.export')}?${params.toString()}`, '_blank')
  }
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState(filters.type ?? '')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    filters.from ? { from: new Date(filters.from), to: filters.to ? new Date(filters.to) : new Date(filters.from) } : undefined,
  )
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustPinOpen, setAdjustPinOpen] = useState(false)
  const [topupPinOpen, setTopupPinOpen] = useState(false)

  const topupForm = useForm({ member_id: '', amount: 0, payment_method_id: '', outlet_id: outlets[0] ? String(outlets[0].id) : '' })
  const withdrawForm = useForm({ member_id: '', amount: 0, note: '' })
  const adjustForm = useForm({ member_id: '', amount: 0, reason: '' })

  // Temuan audit keamanan: key idempotency HARUS dibuat sekali per form
  // (bukan per klik submit), supaya retry (network lambat/klik dobel)
  // mengirim key yang SAMA — backend baru bisa benar-benar men-dedup.
  const topupKeyRef = useRef(newIdempotencyKey())
  const withdrawKeyRef = useRef(newIdempotencyKey())
  const adjustKeyRef = useRef(newIdempotencyKey())

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members.slice(0, 20)
    const q = memberSearch.toLowerCase()

    return members.filter((m) => m.name.toLowerCase().includes(q) || m.member_number.includes(q) || (m.nis ?? '').includes(q)).slice(0, 20)
  }, [members, memberSearch])

  const selectedMember = members.find((m) => String(m.id) === selectedMemberId) ?? null

  function pickMember(id: string) {
    setSelectedMemberId(id)
    topupForm.setData('member_id', id)
  }

  const TOPUP_CASH_PIN_THRESHOLD = 200000

  const submitTopup: FormEventHandler = (e) => {
    e.preventDefault()
    const method = paymentMethods.find((pm) => String(pm.id) === topupForm.data.payment_method_id)

    // REVISI-R1-v2.md §6.3 — top-up TUNAI di atas ambang wajib PIN
    // supervisor. Pengecekan sisi klien ini murni UX (langsung minta PIN
    // tanpa round-trip gagal dulu) — backend TETAP menolak tanpa token
    // valid terlepas dari ini.
    if (method?.type === 'cash' && topupForm.data.amount > TOPUP_CASH_PIN_THRESHOLD) {
      setTopupPinOpen(true)
      return
    }

    doSubmitTopup()
  }

  function doSubmitTopup(token?: string) {
    router.post(route('admin.deposit.topup'), { ...topupForm.data, approval_token: token ?? '' }, {
      preserveScroll: true,
      headers: { 'X-Idempotency-Key': topupKeyRef.current },
      onSuccess: () => {
        topupForm.reset()
        setSelectedMemberId('')
        topupKeyRef.current = newIdempotencyKey()
        setTopupPinOpen(false)
      },
      onError: (errors) => topupForm.setError(errors as never),
    })
  }

  const submitWithdraw: FormEventHandler = (e) => {
    e.preventDefault()
    router.post(route('admin.deposit.withdrawal'), withdrawForm.data, {
      preserveScroll: true,
      headers: { 'X-Idempotency-Key': withdrawKeyRef.current },
      onSuccess: () => {
        withdrawForm.reset()
        setWithdrawOpen(false)
        withdrawKeyRef.current = newIdempotencyKey()
      },
      onError: (errors) => withdrawForm.setError(errors as never),
    })
  }

  const submitAdjust: FormEventHandler = (e) => {
    e.preventDefault()
    setAdjustPinOpen(true)
  }

  function doSubmitAdjust(token: string) {
    router.post(route('admin.deposit.adjustment'), { ...adjustForm.data, approval_token: token }, {
      preserveScroll: true,
      headers: { 'X-Idempotency-Key': adjustKeyRef.current },
      onSuccess: () => {
        adjustForm.reset()
        setAdjustOpen(false)
        adjustKeyRef.current = newIdempotencyKey()
      },
      onError: (errors) => adjustForm.setError(errors as never),
    })
  }

  function applyFilter() {
    router.get(
      route('admin.deposit.index'),
      {
        type: typeFilter,
        from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      },
      { preserveState: true, replace: true },
    )
  }

  const columns: ColumnDef<TransactionRow, unknown>[] = [
    { accessorKey: 'reference', header: 'Referensi' },
    { id: 'member', header: 'Anggota', cell: ({ row }) => row.original.member?.name ?? '—' },
    { id: 'type', header: 'Tipe', cell: ({ row }) => <Badge variant="outline">{TYPE_LABELS[row.original.type] ?? row.original.type}</Badge> },
    { id: 'amount', header: 'Nominal', cell: ({ row }) => <Money amount={row.original.amount} showSign /> },
    { id: 'balance_after', header: 'Saldo Akhir', cell: ({ row }) => <Money amount={row.original.balance_after} /> },
    { id: 'note', header: 'Catatan', cell: ({ row }) => row.original.note ?? '—' },
    { id: 'created_at', header: 'Waktu', cell: ({ row }) => new Date(row.original.created_at).toLocaleString('id-ID') },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Deposit" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Deposit' }]} />
      <PageTabs current={tab} tabs={[
        { key: 'deposit', label: 'Deposit', href: route('admin.deposit.index'), permission: 'deposit.view' },
        { key: 'topup-requests', label: 'Verifikasi Top-Up Wali', href: route('admin.topup-requests.index'), permission: 'topup.view' },
      ]} />

      <Tabs defaultValue="topup">
        <TabsList>
          <TabsTrigger value="topup">Top-Up</TabsTrigger>
          <TabsTrigger value="riwayat">Riwayat</TabsTrigger>
          <TabsTrigger value="penyesuaian">Penyesuaian</TabsTrigger>
        </TabsList>

        <TabsContent value="topup" className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
          {!selectedMember ? (
            <div className="flex flex-col gap-2">
              <Label>Cari Anggota (nama / no. anggota / NIS)</Label>
              <Input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Ketik untuk mencari…" />
              <div className="flex max-h-64 flex-col divide-y divide-border overflow-y-auto rounded-md border border-border">
                {filteredMembers.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => pickMember(String(m.id))}
                    className="flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-bg"
                  >
                    <span>
                      {m.name} <span className="text-content-muted">({m.member_number})</span>
                    </span>
                    <Money amount={m.balance_cache} size="sm" />
                  </button>
                ))}
                {filteredMembers.length === 0 && <p className="p-3 text-sm text-content-muted">Tidak ditemukan.</p>}
              </div>
            </div>
          ) : (
            <form onSubmit={submitTopup} className="flex flex-col gap-4">
              <div className="flex items-center justify-between rounded-md border border-border bg-bg p-3">
                <div>
                  <p className="font-semibold">{selectedMember.name}</p>
                  <p className="text-sm text-content-muted">{selectedMember.member_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-content-muted">Saldo Sekarang</p>
                  <Money amount={selectedMember.balance_cache} size="lg" />
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedMemberId(''); topupForm.setData('member_id', '') }}>
                  Ganti
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label>Nominal Top-Up</Label>
                <MoneyInput value={topupForm.data.amount} onChange={(v) => topupForm.setData('amount', v)} />
                <div className="flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((amt) => (
                    <Button key={amt} type="button" variant="outline" size="sm" onClick={() => topupForm.setData('amount', amt)}>
                      {formatMoney(amt)}
                    </Button>
                  ))}
                </div>
                {topupForm.errors.amount && <p className="text-sm text-danger">{topupForm.errors.amount}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Metode</Label>
                <Select value={topupForm.data.payment_method_id} onValueChange={(v) => topupForm.setData('payment_method_id', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih metode" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.id} value={String(pm.id)}>{pm.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={topupForm.processing || !topupForm.data.payment_method_id || topupForm.data.amount <= 0}>
                Simpan Top-Up
              </Button>
            </form>
          )}
        </TabsContent>

        <TabsContent value="riwayat" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={typeFilter || 'all'} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Semua tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua tipe</SelectItem>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <Button variant="outline" onClick={applyFilter}>Terapkan</Button>
            <div className="ml-auto flex gap-2">
              {canWithdraw && <Button variant="outline" onClick={() => setWithdrawOpen(true)}>Tarik Saldo</Button>}
              {canAdjust && <Button variant="outline" onClick={() => setAdjustOpen(true)}>Sesuaikan Saldo</Button>}
            </div>
          </div>

          <DataTable
            columns={columns}
            data={transactions.data}
            getRowId={(row) => String(row.id)}
            pagination={{
              page: transactions.current_page,
              perPage: transactions.per_page,
              total: transactions.total,
              onPageChange: (page) => router.get(route('admin.deposit.index'), { type: typeFilter, page }, { preserveState: true }),
            }}
          />
        </TabsContent>

        {/* REVISI-R1-v2.md §6.2 — Riwayat Penyesuaian Saldo, tab terpisah
            dengan filter & ekspor sendiri (prioritas khusus). */}
        <TabsContent value="penyesuaian" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={adjMemberFilter || 'all'} onValueChange={(v) => setAdjMemberFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Semua anggota" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua anggota</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.name} ({m.member_number})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangePicker value={adjDateRange} onChange={setAdjDateRange} />
            <Button variant="outline" onClick={applyAdjFilter}>Terapkan</Button>
            <Button variant="outline" className="ml-auto" onClick={exportAdjustments}>Ekspor Excel</Button>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-bg">
                <tr>
                  <th className="p-2 text-left">Tanggal</th>
                  <th className="p-2 text-left">Anggota</th>
                  <th className="p-2 text-left">Jenis</th>
                  <th className="p-2 text-right">Nominal</th>
                  <th className="p-2 text-right">Saldo Sebelum</th>
                  <th className="p-2 text-right">Saldo Sesudah</th>
                  <th className="p-2 text-left">Alasan</th>
                  <th className="p-2 text-left">Dilakukan Oleh</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.data.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="p-2 font-mono text-xs">{formatDateTime(row.created_at)}</td>
                    <td className="p-2">{row.member ? `${row.member.name} (${row.member.member_number})` : '—'}</td>
                    <td className="p-2">
                      <Badge className={row.amount >= 0 ? 'bg-success text-white' : 'bg-danger text-white'}>
                        {row.amount >= 0 ? 'Tambah' : 'Kurangi'}
                      </Badge>
                    </td>
                    <td className="p-2 text-right"><Money amount={row.amount} size="sm" showSign /></td>
                    <td className="p-2 text-right"><Money amount={row.balance_before} size="sm" /></td>
                    <td className="p-2 text-right"><Money amount={row.balance_after} size="sm" /></td>
                    <td className="p-2 max-w-xs">{row.note ?? '—'}</td>
                    <td className="p-2">{row.approver?.name ?? '—'}</td>
                  </tr>
                ))}
                {adjustments.data.length === 0 && (
                  <tr><td colSpan={8} className="p-6 text-center text-content-muted">Belum ada penyesuaian saldo.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {adjustments.last_page > 1 && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <Button
                type="button" size="sm" variant="outline" disabled={adjustments.current_page <= 1}
                onClick={() => router.get(route('admin.deposit.index'), { member_adj: adjMemberFilter, adj_page: adjustments.current_page - 1 }, { preserveState: true })}
              >◀</Button>
              <span>Hal. {adjustments.current_page} / {adjustments.last_page}</span>
              <Button
                type="button" size="sm" variant="outline" disabled={adjustments.current_page >= adjustments.last_page}
                onClick={() => router.get(route('admin.deposit.index'), { member_adj: adjMemberFilter, adj_page: adjustments.current_page + 1 }, { preserveState: true })}
              >▶</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tarik Saldo</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitWithdraw} className="flex flex-col gap-4 px-1">
            <div className="space-y-1.5">
              <Label>Anggota</Label>
              <Select value={withdrawForm.data.member_id} onValueChange={(v) => withdrawForm.setData('member_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih anggota" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.name} ({m.member_number})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {withdrawForm.errors.member_id && <p className="text-sm text-danger">{withdrawForm.errors.member_id}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Nominal</Label>
              <MoneyInput value={withdrawForm.data.amount} onChange={(v) => withdrawForm.setData('amount', v)} />
              {withdrawForm.errors.amount && <p className="text-sm text-danger">{withdrawForm.errors.amount}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea value={withdrawForm.data.note} onChange={(e) => withdrawForm.setData('note', e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={withdrawForm.processing}>Proses Penarikan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sesuaikan Saldo (Owner)</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitAdjust} className="flex flex-col gap-4 px-1">
            <div className="space-y-1.5">
              <Label>Anggota</Label>
              <Select value={adjustForm.data.member_id} onValueChange={(v) => adjustForm.setData('member_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih anggota" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.name} ({m.member_number})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {adjustForm.errors.member_id && <p className="text-sm text-danger">{adjustForm.errors.member_id}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Nominal (boleh negatif untuk mengurangi)</Label>
              <Input
                type="number"
                value={adjustForm.data.amount}
                onChange={(e) => adjustForm.setData('amount', Number(e.target.value))}
              />
              {adjustForm.errors.amount && <p className="text-sm text-danger">{adjustForm.errors.amount}</p>}
            </div>
            {/* REVISI-R1-v2.md §6.2 — pratinjau "Saldo X → Y" sebelum simpan. */}
            {(() => {
              const m = members.find((mm) => String(mm.id) === adjustForm.data.member_id)
              if (!m || !adjustForm.data.amount) return null
              const after = m.balance_cache + adjustForm.data.amount
              return (
                <p className="rounded-md bg-bg p-2 text-sm">
                  Saldo <Money amount={m.balance_cache} size="sm" /> → <Money amount={after} size="sm" />{' '}
                  ({adjustForm.data.amount > 0 ? '+' : ''}<Money amount={adjustForm.data.amount} size="sm" showSign />)
                </p>
              )
            })()}
            <div className="space-y-1.5">
              <Label>Alasan (wajib, minimal 20 karakter, tercatat di audit)</Label>
              <Textarea value={adjustForm.data.reason} onChange={(e) => adjustForm.setData('reason', e.target.value)} />
              <p className="text-xs text-content-muted">{adjustForm.data.reason.length}/20 karakter minimum</p>
              {adjustForm.errors.reason && <p className="text-sm text-danger">{adjustForm.errors.reason}</p>}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={adjustForm.processing || adjustForm.data.reason.length < 20}>Simpan Penyesuaian</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <SupervisorPinDialog
        open={topupPinOpen}
        onOpenChange={setTopupPinOpen}
        permission="topup.approve"
        title="Konfirmasi Top-Up Tunai Nominal Besar"
        description={`Top-up tunai di atas Rp ${TOPUP_CASH_PIN_THRESHOLD.toLocaleString('id-ID')} wajib PIN supervisor.`}
        onApproved={(token) => doSubmitTopup(token)}
      />

      <SupervisorPinDialog
        open={adjustPinOpen}
        onOpenChange={setAdjustPinOpen}
        permission="deposit.adjust"
        title="Konfirmasi Penyesuaian Saldo"
        description="Aksi ini mengubah saldo anggota tanpa transaksi/uang fisik — masukkan PIN owner untuk melanjutkan."
        onApproved={(token) => doSubmitAdjust(token)}
      />
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
