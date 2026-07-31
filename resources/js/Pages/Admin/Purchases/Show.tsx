import { useState, type FormEventHandler, type ReactElement } from 'react'
import { useForm } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { Money } from '@/Components/common/Money'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Textarea } from '@/Components/ui/textarea'
import { Badge } from '@/Components/ui/badge'
import { Checkbox } from '@/Components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'

type ItemRow = {
  id: number
  qty: string
  qty_base: string
  unit_price: number
  final_unit_cost: number
  batch_no: string | null
  expired_at: string | null
  product: { id: number; name: string; sku: string }
}

type PurchaseDetail = {
  id: number
  reference: string
  invoice_no: string | null
  purchase_date: string
  type: string
  payment_type: string
  subtotal: number
  discount: number
  tax: number
  other_cost: number
  total: number
  supplier: { id: number; name: string }
  outlet: { id: number; name: string }
  items: ItemRow[]
  other_costs: { id: number; name: string; amount: number }[]
  debt: { id: number; reference: string; remaining_amount: number; status: string }[]
}

export default function Show({ purchase }: { purchase: PurchaseDetail }) {
  const [returnOpen, setReturnOpen] = useState(false)
  const [selected, setSelected] = useState<Record<number, { checked: boolean; qty: number }>>({})
  const form = useForm({ purchase_id: purchase.id, return_date: new Date().toISOString().slice(0, 10), reason: '', items: [] as { purchase_item_id: number; qty: number; unit_cost: number }[] })

  function toggleItem(item: ItemRow, checked: boolean) {
    setSelected((prev) => ({ ...prev, [item.id]: { checked, qty: prev[item.id]?.qty ?? Number(item.qty) } }))
  }

  function setQty(itemId: number, qty: number) {
    setSelected((prev) => ({ ...prev, [itemId]: { checked: prev[itemId]?.checked ?? false, qty } }))
  }

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    const items = purchase.items
      .filter((it) => selected[it.id]?.checked)
      .map((it) => ({ purchase_item_id: it.id, qty: selected[it.id]?.qty ?? Number(it.qty), unit_cost: it.final_unit_cost }))

    form.transform((data) => ({ ...data, items }))
    form.post(route('admin.purchase-returns.store'), {
      preserveScroll: true,
      onSuccess: () => {
        setReturnOpen(false)
        setSelected({})
        form.reset()
      },
    })
  }

  const debt = purchase.debt[0]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={purchase.reference}
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Pembelian', href: '/admin/purchases' }, { label: purchase.reference }]}
        actions={<Button variant="outline" onClick={() => setReturnOpen(true)}>Retur Pembelian</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-content-muted">Supplier</p>
          <p className="font-medium">{purchase.supplier.name}</p>
          <p className="mt-2 text-xs text-content-muted">Outlet</p>
          <p className="font-medium">{purchase.outlet.name}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-content-muted">Tipe</p>
          <p className="font-medium">{purchase.type === 'consignment' ? 'Konsinyasi' : 'Reguler'} · {purchase.payment_type === 'credit' ? 'Kredit' : 'Tunai'}</p>
          <p className="mt-2 text-xs text-content-muted">No. Faktur</p>
          <p className="font-medium">{purchase.invoice_no ?? '—'}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-content-muted">Total</p>
          <Money amount={purchase.total} size="lg" />
          {debt && (
            <>
              <p className="mt-2 text-xs text-content-muted">Sisa Hutang</p>
              <Badge className={debt.status === 'paid' ? 'bg-success text-white' : 'bg-warning text-white'}>
                <Money amount={debt.remaining_amount} size="sm" />
              </Badge>
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Harga Beli</TableHead>
              <TableHead>HPP Final</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Kadaluwarsa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchase.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.product.name} <span className="text-content-muted">({item.product.sku})</span></TableCell>
                <TableCell>{item.qty_base}</TableCell>
                <TableCell><Money amount={item.unit_price} size="sm" /></TableCell>
                <TableCell><Money amount={item.final_unit_cost} size="sm" /></TableCell>
                <TableCell>{item.batch_no ?? '—'}</TableCell>
                <TableCell>{item.expired_at ? new Date(item.expired_at).toLocaleDateString('id-ID') : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {purchase.other_costs.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="mb-2 text-sm font-medium">Biaya Tambahan</p>
          {purchase.other_costs.map((c) => (
            <div key={c.id} className="flex justify-between text-sm">
              <span>{c.name}</span>
              <Money amount={c.amount} size="sm" />
            </div>
          ))}
        </div>
      )}

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Retur Pembelian — {purchase.reference}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4 px-1">
            <div className="space-y-1.5">
              <Label>Tanggal Retur</Label>
              <Input type="date" value={form.data.return_date} onChange={(e) => form.setData('return_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Alasan</Label>
              <Textarea value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} />
              {form.errors.reason && <p className="text-sm text-danger">{form.errors.reason}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Pilih Item</Label>
              {purchase.items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                  <Checkbox
                    checked={selected[item.id]?.checked ?? false}
                    onCheckedChange={(c) => toggleItem(item, !!c)}
                  />
                  <span className="flex-1 text-sm">{item.product.name}</span>
                  <Input
                    type="number"
                    className="w-24"
                    min={0.001}
                    max={Number(item.qty_base)}
                    step="0.001"
                    disabled={!selected[item.id]?.checked}
                    value={selected[item.id]?.qty ?? Number(item.qty_base)}
                    onChange={(e) => setQty(item.id, Number(e.target.value))}
                  />
                </div>
              ))}
              {form.errors.items && <p className="text-sm text-danger">{form.errors.items}</p>}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={form.processing}>Proses Retur</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Show.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
