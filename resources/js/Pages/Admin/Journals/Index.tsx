import { useState, type FormEventHandler, type ReactElement } from 'react'
import { Link, router, useForm } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { DataTable } from '@/Components/common/DataTable'
import { Money } from '@/Components/common/Money'
import { Button } from '@/Components/ui/button'
import { Label } from '@/Components/ui/label'
import { Input } from '@/Components/ui/input'
import { Badge } from '@/Components/ui/badge'
import { Card, CardContent } from '@/Components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import type { Paginated } from '@/Types'

type Ref = { id: number; name: string } | null

type JournalRow = {
  id: number
  reference: string
  journal_date: string
  type: string
  description: string | null
  total_debit: number
  total_credit: number
  status: 'draft' | 'posted' | 'reversed'
  outlet: Ref
  creator: Ref
  poster: Ref
}

type AccountOption = { id: number; code: string; name: string }
type OutletOption = { id: number; name: string }

type ValidationSummary = {
  sale_without_journal: number
  sale_return_without_journal: number
  purchase_without_journal: number
  purchase_return_without_journal: number
  debt_payment_without_journal: number
  receivable_payment_without_journal: number
  unbalanced_journals: number
}

type JournalsIndexProps = {
  journals: Paginated<JournalRow>
  accounts: AccountOption[]
  outlets: OutletOption[]
  filters: { type?: string; status?: string; from?: string; to?: string }
  validation: ValidationSummary
}

const TYPE_LABELS: Record<string, string> = {
  general: 'Umum', sales: 'Penjualan', purchase: 'Pembelian', cash: 'Kas',
  adjustment: 'Penyesuaian', closing: 'Penutup', reversing: 'Pembalik',
}
const STATUS_LABELS: Record<string, string> = { draft: 'Draft', posted: 'Diposting', reversed: 'Dibalik' }
const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-warning text-white', posted: 'bg-success text-white', reversed: 'bg-slate-500 text-white',
}

const VALIDATION_LABELS: Record<keyof ValidationSummary, string> = {
  sale_without_journal: 'Penjualan tanpa jurnal',
  sale_return_without_journal: 'Retur penjualan tanpa jurnal',
  purchase_without_journal: 'Pembelian tanpa jurnal',
  purchase_return_without_journal: 'Retur pembelian tanpa jurnal',
  debt_payment_without_journal: 'Pembayaran utang tanpa jurnal',
  receivable_payment_without_journal: 'Pelunasan piutang tanpa jurnal',
  unbalanced_journals: 'Jurnal tidak seimbang',
}

type EntryLine = { account_code: string; debit: string; credit: string; description: string }

export default function Index({ journals, accounts, outlets, filters, validation }: JournalsIndexProps) {
  const [typeFilter, setTypeFilter] = useState(filters.type ?? '')
  const [statusFilter, setStatusFilter] = useState(filters.status ?? '')
  const [manualOpen, setManualOpen] = useState(false)

  const form = useForm<{
    journal_date: string
    type: string
    description: string
    outlet_id: string
    entries: EntryLine[]
  }>({
    journal_date: new Date().toISOString().slice(0, 10),
    type: 'general',
    description: '',
    outlet_id: '',
    entries: [
      { account_code: '', debit: '0', credit: '0', description: '' },
      { account_code: '', debit: '0', credit: '0', description: '' },
    ],
  })

  function applyFilters(next: Partial<{ type: string; status: string }>) {
    const merged = { type: typeFilter, status: statusFilter, ...next }
    setTypeFilter(merged.type)
    setStatusFilter(merged.status)
    router.get(route('admin.journals.index'), merged, { preserveState: true, replace: true })
  }

  function addLine() {
    form.setData('entries', [...form.data.entries, { account_code: '', debit: '0', credit: '0', description: '' }])
  }

  function removeLine(index: number) {
    form.setData('entries', form.data.entries.filter((_, i) => i !== index))
  }

  function updateLine(index: number, patch: Partial<EntryLine>) {
    form.setData('entries', form.data.entries.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  const totalDebit = form.data.entries.reduce((sum, l) => sum + (Number(l.debit) || 0), 0)
  const totalCredit = form.data.entries.reduce((sum, l) => sum + (Number(l.credit) || 0), 0)

  const submitManual: FormEventHandler = (e) => {
    e.preventDefault()
    form.transform((data) => ({
      ...data,
      outlet_id: data.outlet_id || null,
      entries: data.entries.map((l) => ({ ...l, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 })),
    }))
    form.post(route('admin.journals.store'), {
      preserveScroll: true,
      onSuccess: () => { form.reset(); setManualOpen(false) },
    })
  }

  const columns: ColumnDef<JournalRow, unknown>[] = [
    { id: 'reference', header: 'Referensi', cell: ({ row }) => <Link href={route('admin.journals.show', row.original.id)} className="font-medium text-navy-600 hover:underline">{row.original.reference}</Link> },
    { id: 'date', header: 'Tanggal', cell: ({ row }) => new Date(row.original.journal_date).toLocaleDateString('id-ID') },
    { id: 'type', header: 'Tipe', cell: ({ row }) => TYPE_LABELS[row.original.type] ?? row.original.type },
    { accessorKey: 'description', header: 'Keterangan' },
    { id: 'debit', header: 'Debit', cell: ({ row }) => <Money amount={row.original.total_debit} size="sm" /> },
    { id: 'credit', header: 'Kredit', cell: ({ row }) => <Money amount={row.original.total_credit} size="sm" /> },
    { id: 'status', header: 'Status', cell: ({ row }) => <Badge className={STATUS_BADGE[row.original.status]}>{STATUS_LABELS[row.original.status]}</Badge> },
  ]

  const validationTotal = Object.values(validation).reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Jurnal Umum"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Jurnal' }]}
        actions={<Button onClick={() => setManualOpen(true)}>Jurnal Manual</Button>}
      />

      <Card className={validationTotal > 0 ? 'border-warning' : 'border-success'}>
        <CardContent className="flex flex-col gap-2 p-4">
          <p className="font-medium">Validasi Jurnal</p>
          {validationTotal === 0 ? (
            <p className="text-sm text-success">Semua transaksi wajib-jurnal sudah tercatat dan seimbang.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              {(Object.keys(validation) as (keyof ValidationSummary)[]).filter((k) => validation[k] > 0).map((k) => (
                <div key={k} className="flex items-center justify-between rounded-md bg-danger/10 px-2 py-1">
                  <span className="text-content-muted">{VALIDATION_LABELS[k]}</span>
                  <span className="font-semibold text-danger">{validation[k]}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Select value={typeFilter || 'all'} onValueChange={(v) => applyFilters({ type: v === 'all' ? '' : v })}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Semua tipe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua tipe</SelectItem>
            {Object.entries(TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter || 'all'} onValueChange={(v) => applyFilters({ status: v === 'all' ? '' : v })}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Semua status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={journals.data}
        getRowId={(row) => String(row.id)}
        pagination={{
          page: journals.current_page,
          perPage: journals.per_page,
          total: journals.total,
          onPageChange: (page) => router.get(route('admin.journals.index'), { type: typeFilter, status: statusFilter, page }, { preserveState: true }),
        }}
      />

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Jurnal Manual</DialogTitle></DialogHeader>
          <form onSubmit={submitManual} className="flex flex-col gap-4 px-1">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Tanggal</Label>
                <Input type="date" value={form.data.journal_date} onChange={(e) => form.setData('journal_date', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipe</Label>
                <Select value={form.data.type} onValueChange={(v) => form.setData('type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Outlet (opsional)</Label>
                <Select value={form.data.outlet_id || 'none'} onValueChange={(v) => form.setData('outlet_id', v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Semua outlet" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Semua outlet</SelectItem>
                    {outlets.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Keterangan</Label>
              <Input value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
              {form.errors.description && <p className="text-sm text-danger">{form.errors.description}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Baris Jurnal</Label>
              {form.data.entries.map((line, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select value={line.account_code} onValueChange={(v) => updateLine(index, { account_code: v })}>
                    <SelectTrigger className="w-56"><SelectValue placeholder="Akun" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => <SelectItem key={a.id} value={a.code}>{a.code} — {a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Debit" className="w-28" value={line.debit} onChange={(e) => updateLine(index, { debit: e.target.value })} />
                  <Input type="number" placeholder="Kredit" className="w-28" value={line.credit} onChange={(e) => updateLine(index, { credit: e.target.value })} />
                  <Input placeholder="Keterangan (opsional)" className="flex-1" value={line.description} onChange={(e) => updateLine(index, { description: e.target.value })} />
                  <Button type="button" variant="ghost" size="sm" className="text-danger" onClick={() => removeLine(index)} disabled={form.data.entries.length <= 2}>Hapus</Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={addLine}>+ Tambah Baris</Button>
              {form.errors.entries && <p className="text-sm text-danger">{form.errors.entries}</p>}
            </div>

            <div className={`flex justify-between rounded-md p-2 text-sm ${totalDebit === totalCredit ? 'bg-success/10' : 'bg-danger/10'}`}>
              <span>Total Debit: <Money amount={totalDebit} size="sm" /></span>
              <span>Total Kredit: <Money amount={totalCredit} size="sm" /></span>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={form.processing || totalDebit !== totalCredit || totalDebit === 0}>Simpan (Draft)</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
