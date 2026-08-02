import { useState, type FormEventHandler, type ReactElement } from 'react'
import { useForm } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { Button } from '@/Components/ui/button'
import { Label } from '@/Components/ui/label'
import { Badge } from '@/Components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/Components/ui/alert-dialog'
import { formatDate } from '@/Lib/date'

type PeriodRow = {
  id: number
  year: number
  month: number
  start_date: string
  end_date: string
  status: 'open' | 'closed' | 'locked'
  closer: { id: number; name: string } | null
  closed_at: string | null
}

type AccountingPeriodsIndexProps = { tab: string; periods: PeriodRow[] }

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const STATUS_LABELS: Record<string, string> = { open: 'Terbuka', closed: 'Ditutup', locked: 'Terkunci' }
const STATUS_BADGE: Record<string, string> = { open: 'bg-success text-white', closed: 'bg-slate-500 text-white', locked: 'bg-danger text-white' }

export default function Index({ tab, periods }: AccountingPeriodsIndexProps) {
  const now = new Date()
  const [closeOpen, setCloseOpen] = useState(false)
  const [reopenTarget, setReopenTarget] = useState<PeriodRow | null>(null)
  const form = useForm({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const reopenForm = useForm({ year: 0, month: 0 })

  const submitClose: FormEventHandler = (e) => {
    e.preventDefault()
    form.put(route('admin.accounting-periods.close'), {
      preserveScroll: true,
      onSuccess: () => setCloseOpen(false),
    })
  }

  function confirmReopen() {
    if (!reopenTarget) return
    reopenForm.setData({ year: reopenTarget.year, month: reopenTarget.month })
    reopenForm.put(route('admin.accounting-periods.reopen'), {
      preserveScroll: true,
      onFinish: () => setReopenTarget(null),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Periode Akuntansi"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Periode Akuntansi' }]}
        actions={<Button onClick={() => setCloseOpen(true)}>Tutup Periode</Button>}
      />
      <PageTabs current={tab} tabs={[
        { key: 'accounts', label: 'Bagan Akun', href: route('admin.accounts.index'), permission: 'setting.view' },
        { key: 'journals', label: 'Jurnal', href: route('admin.journals.index'), permission: 'journal.view' },
        { key: 'ledger', label: 'Buku Besar', href: route('admin.ledger.index'), permission: 'ledger.view' },
        { key: 'trial-balance', label: 'Neraca Saldo', href: route('admin.trial-balance.index'), permission: 'ledger.view' },
        { key: 'profit-loss', label: 'Laba Rugi', href: route('admin.profit-loss.index'), permission: 'ledger.view' },
        { key: 'balance-sheet', label: 'Neraca', href: route('admin.balance-sheet.index'), permission: 'ledger.view' },
        { key: 'accounting-periods', label: 'Periode', href: route('admin.accounting-periods.index'), permission: 'ledger.view' },
      ]} />

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-content-muted">
            <tr><th className="p-2">Periode</th><th className="p-2">Rentang</th><th className="p-2">Status</th><th className="p-2">Ditutup Oleh</th><th className="p-2" /></tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={period.id} className="border-t border-border">
                <td className="p-2 font-medium">{MONTH_NAMES[period.month - 1]} {period.year}</td>
                <td className="p-2 text-content-muted">{formatDate(period.start_date)} — {formatDate(period.end_date)}</td>
                <td className="p-2"><Badge className={STATUS_BADGE[period.status]}>{STATUS_LABELS[period.status]}</Badge></td>
                <td className="p-2">{period.closer?.name ?? '—'}</td>
                <td className="p-2">
                  {period.status === 'closed' && (
                    <Button size="sm" variant="outline" onClick={() => setReopenTarget(period)}>Buka Kembali</Button>
                  )}
                </td>
              </tr>
            ))}
            {periods.length === 0 && <tr><td className="p-4 text-center text-content-muted" colSpan={5}>Belum ada periode ditutup.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tutup Periode Akuntansi</DialogTitle></DialogHeader>
          <form onSubmit={submitClose} className="flex flex-col gap-4 px-1">
            <p className="text-sm text-content-muted">
              Jurnal penutup akan dibuat otomatis (pendapatan &amp; beban dipindah ke Laba Ditahan). Sesudah ditutup, jurnal baru tidak bisa ditambahkan ke periode ini kecuali dibuka kembali.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Bulan</Label>
                <Select value={String(form.data.month)} onValueChange={(v) => form.setData('month', Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, index) => <SelectItem key={name} value={String(index + 1)}>{name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tahun</Label>
                <Select value={String(form.data.year)} onValueChange={(v) => form.setData('year', Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {Object.values(form.errors).length > 0 && <p className="text-sm text-danger">{Object.values(form.errors)[0]}</p>}
            <DialogFooter>
              <Button type="submit" disabled={form.processing}>Ya, Tutup Periode</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={reopenTarget !== null} onOpenChange={(open) => !open && setReopenTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Buka kembali periode {reopenTarget && `${MONTH_NAMES[reopenTarget.month - 1]} ${reopenTarget.year}`}?</AlertDialogTitle>
            <AlertDialogDescription>
              Jurnal baru akan bisa ditambahkan lagi ke periode ini. Jurnal penutup yang sudah dibuat TIDAK otomatis dibalik — pastikan ini memang disengaja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReopen}>Ya, Buka Kembali</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
