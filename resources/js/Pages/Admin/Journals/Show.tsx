import { useState, type FormEventHandler, type ReactElement } from 'react'
import { Link, router, useForm } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { Money } from '@/Components/common/Money'
import { Button } from '@/Components/ui/button'
import { Label } from '@/Components/ui/label'
import { Input } from '@/Components/ui/input'
import { Badge } from '@/Components/ui/badge'
import { Card, CardContent } from '@/Components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { toast } from 'sonner'

type Ref = { id: number; name: string } | null

type EntryRow = {
  id: number
  debit: number
  credit: number
  description: string | null
  account: { id: number; code: string; name: string }
}

type JournalDetail = {
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
  reversed_journal: { id: number; reference: string } | null
  entries: EntryRow[]
}

type JournalShowProps = { journal: JournalDetail }

const TYPE_LABELS: Record<string, string> = {
  general: 'Umum', sales: 'Penjualan', purchase: 'Pembelian', cash: 'Kas',
  adjustment: 'Penyesuaian', closing: 'Penutup', reversing: 'Pembalik',
}
const STATUS_LABELS: Record<string, string> = { draft: 'Draft', posted: 'Diposting', reversed: 'Dibalik' }
const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-warning text-white', posted: 'bg-success text-white', reversed: 'bg-slate-500 text-white',
}

export default function Show({ journal }: JournalShowProps) {
  const [reverseOpen, setReverseOpen] = useState(false)
  const form = useForm({ reason: '' })

  function postJournal() {
    router.put(route('admin.journals.post', journal.id), {}, {
      onError: (errors) => toast.error(Object.values(errors)[0] ?? 'Gagal memposting jurnal.'),
    })
  }

  const submitReverse: FormEventHandler = (e) => {
    e.preventDefault()
    form.put(route('admin.journals.reverse', journal.id), {
      onSuccess: () => setReverseOpen(false),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`Jurnal ${journal.reference}`}
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Jurnal', href: route('admin.journals.index') }, { label: journal.reference }]}
        actions={<Badge className={STATUS_BADGE[journal.status]}>{STATUS_LABELS[journal.status]}</Badge>}
      />

      <Card>
        <CardContent className="grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-4">
          <div><p className="text-content-muted">Tanggal</p><p className="font-medium">{new Date(journal.journal_date).toLocaleDateString('id-ID')}</p></div>
          <div><p className="text-content-muted">Tipe</p><p className="font-medium">{TYPE_LABELS[journal.type] ?? journal.type}</p></div>
          <div><p className="text-content-muted">Outlet</p><p className="font-medium">{journal.outlet?.name ?? '—'}</p></div>
          <div><p className="text-content-muted">Keterangan</p><p className="font-medium">{journal.description ?? '—'}</p></div>
          <div><p className="text-content-muted">Dibuat Oleh</p><p className="font-medium">{journal.creator?.name ?? 'Sistem (otomatis)'}</p></div>
          <div><p className="text-content-muted">Diposting Oleh</p><p className="font-medium">{journal.poster?.name ?? '—'}</p></div>
          {journal.reversed_journal && (
            <div>
              <p className="text-content-muted">Membalik</p>
              <Link href={route('admin.journals.show', journal.reversed_journal.id)} className="font-medium text-navy-600 hover:underline">
                {journal.reversed_journal.reference}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-content-muted">
            <tr><th className="p-2">Akun</th><th className="p-2">Keterangan</th><th className="p-2 text-right">Debit</th><th className="p-2 text-right">Kredit</th></tr>
          </thead>
          <tbody>
            {journal.entries.map((entry) => (
              <tr key={entry.id} className="border-t border-border">
                <td className="p-2 font-mono">{entry.account.code} — {entry.account.name}</td>
                <td className="p-2 text-content-muted">{entry.description ?? '—'}</td>
                <td className="p-2 text-right">{entry.debit > 0 && <Money amount={entry.debit} size="sm" />}</td>
                <td className="p-2 text-right">{entry.credit > 0 && <Money amount={entry.credit} size="sm" />}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border font-semibold">
              <td className="p-2" colSpan={2}>Total</td>
              <td className="p-2 text-right"><Money amount={journal.total_debit} size="sm" /></td>
              <td className="p-2 text-right"><Money amount={journal.total_credit} size="sm" /></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex gap-2">
        {journal.status === 'draft' && <Button onClick={postJournal}>Posting Jurnal</Button>}
        {journal.status === 'posted' && <Button variant="outline" className="text-danger" onClick={() => setReverseOpen(true)}>Balik Jurnal Ini</Button>}
      </div>

      <Dialog open={reverseOpen} onOpenChange={setReverseOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Balik Jurnal {journal.reference}</DialogTitle></DialogHeader>
          <form onSubmit={submitReverse} className="flex flex-col gap-4 px-1">
            <p className="text-sm text-content-muted">
              Akan dibuat jurnal baru yang membalik seluruh baris debit/kredit jurnal ini. Aksi ini tidak bisa dibatalkan.
            </p>
            <div className="space-y-1.5">
              <Label>Alasan</Label>
              <Input value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} />
              {form.errors.reason && <p className="text-sm text-danger">{form.errors.reason}</p>}
            </div>
            <DialogFooter>
              <Button type="submit" variant="destructive" disabled={form.processing}>Ya, Balik Jurnal</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Show.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
