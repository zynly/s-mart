import { useState, type FormEventHandler, type ReactElement } from 'react'
import { Head, Link, router, useForm } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { Money } from '@/Components/common/Money'
import { Button } from '@/Components/ui/button'
import { Label } from '@/Components/ui/label'
import { Badge } from '@/Components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { formatDate } from '@/Lib/date'
import { Printer, FileText, CheckCircle2, Wallet, ArrowLeft } from 'lucide-react'

type Ref = { id: number; name: string; code?: string; phone?: string; address?: string }
type CashAccountRef = { id: number; name: string; type: string; current_balance: number }

type SettlementItem = {
  id: number
  product_id: number
  qty_sold: string
  unit_price: number
  total_price: number
  commission: number
  payable: number
  product: {
    id: number
    name: string
    sku: string
    base_unit?: { id: number; name: string; symbol: string }
  }
}

type SettlementDetail = {
  id: number
  reference: string
  period_start: string
  period_end: string
  total_sold: number
  commission_percent: string
  commission_amount: number
  payable_amount: number
  status: 'draft' | 'approved' | 'paid'
  paid_at: string | null
  supplier: Ref
  outlet: Ref
  cash_account: { id: number; name: string; type: string } | null
  creator: { id: number; name: string } | null
  approver: { id: number; name: string } | null
  items: SettlementItem[]
}

type ShowProps = {
  settlement: SettlementDetail
  cashAccounts: CashAccountRef[]
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  approved: 'Disetujui',
  paid: 'Lunas Dibayar',
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-500 text-white',
  approved: 'bg-blue-600 text-white',
  paid: 'bg-emerald-600 text-white',
}

export default function Show({ settlement, cashAccounts }: ShowProps) {
  const [payDialogOpen, setPayDialogOpen] = useState(false)

  const payForm = useForm({
    cash_account_id: cashAccounts[0] ? String(cashAccounts[0].id) : '',
  })

  const selectedCashAccount = cashAccounts.find((a) => String(a.id) === payForm.data.cash_account_id)
  const isInsufficient = selectedCashAccount ? selectedCashAccount.current_balance < settlement.payable_amount : false

  const handleApprove = () => {
    if (confirm('Apakah Anda yakin ingin menyetujui dokumen settlement ini?')) {
      router.put(route('admin.consignment.approve', settlement.id), {}, { preserveScroll: true })
    }
  }

  const handlePay: FormEventHandler = (e) => {
    e.preventDefault()
    payForm.put(route('admin.consignment.mark-paid', settlement.id), {
      preserveScroll: true,
      onSuccess: () => {
        setPayDialogOpen(false)
      },
    })
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <Head title={`Settlement ${settlement.reference}`} />

      <PageHeader
        title={settlement.reference}
        subtitle="Rincian rekonsiliasi dan pembagian hasil barang titipan (konsinyasi)"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Konsinyasi', href: route('admin.consignment.index') },
          { label: settlement.reference },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={route('admin.consignment.index')}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Kembali
              </Link>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(route('admin.consignment.export-pdf', settlement.id), '_blank')}
            >
              <Printer className="mr-1.5 h-4 w-4" /> Cetak Slip (PDF)
            </Button>

            {settlement.status === 'draft' && (
              <Button size="sm" onClick={handleApprove} className="bg-blue-600 hover:bg-blue-700 text-white">
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Setujui Dokumen
              </Button>
            )}

            {settlement.status === 'approved' && (
              <Button size="sm" onClick={() => setPayDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Wallet className="mr-1.5 h-4 w-4" /> Bayar & Tandai Lunas
              </Button>
            )}
          </div>
        }
      />

      {/* Top Header Card */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border border-border shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-content-muted">
              Pemasok Konsinyor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-bold text-navy-950 dark:text-white">{settlement.supplier.name}</p>
            {settlement.supplier.code && (
              <p className="text-xs text-content-muted">Kode: {settlement.supplier.code}</p>
            )}
            {settlement.supplier.phone && (
              <p className="text-xs text-content-muted">Telepon: {settlement.supplier.phone}</p>
            )}
            {settlement.supplier.address && (
              <p className="text-xs text-content-muted">{settlement.supplier.address}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-content-muted">
              Periode & Outlet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-content">
                {formatDate(settlement.period_start)} – {formatDate(settlement.period_end)}
              </span>
            </div>
            <p className="text-xs text-content-muted">Outlet: {settlement.outlet.name}</p>
            <div className="pt-1 flex items-center gap-2">
              <span className="text-xs text-content-muted">Status:</span>
              <Badge className={STATUS_BADGE[settlement.status] ?? ''}>
                {STATUS_LABELS[settlement.status] ?? settlement.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-content-muted">
              Informasi Pembayaran
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {settlement.status === 'paid' ? (
              <>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Lunas Dibayarkan
                </p>
                <p className="text-xs text-content-muted">
                  Tanggal: {settlement.paid_at ? formatDate(settlement.paid_at) : '—'}
                </p>
                <p className="text-xs text-content-muted">
                  Sumber Kas: <span className="font-medium text-content">{settlement.cash_account?.name ?? 'Kas Default'}</span>
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-amber-600 dark:text-amber-400">
                  Menunggu Pelunasan
                </p>
                <p className="text-xs text-content-muted">
                  Wajib dibayarkan ke supplier setelah dokumen disetujui.
                </p>
              </>
            )}
            {settlement.creator && (
              <p className="text-[11px] text-content-muted pt-1">
                Dibuat oleh: {settlement.creator.name}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary Highlight */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-content-muted">Total Penjualan Kotor</span>
          <div className="mt-2 text-xl font-bold text-navy-950 dark:text-white">
            <Money amount={settlement.total_sold} />
          </div>
          <span className="text-[11px] text-content-muted mt-1">Omzet barang titipan yang laku</span>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-900 dark:text-blue-200">
              Komisi Mart ({settlement.commission_percent}%)
            </span>
            <Badge variant="outline" className="bg-white/80 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300 text-[10px]">
              Pendapatan Toko
            </Badge>
          </div>
          <div className="mt-2 text-xl font-bold text-blue-700 dark:text-blue-300">
            <Money amount={settlement.commission_amount} />
          </div>
          <span className="text-[11px] text-blue-600/80 dark:text-blue-300/70 mt-1">
            Diakui ke akun Pendapatan Komisi (4-1300)
          </span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
              Total Bersih ke Supplier
            </span>
            <Badge variant="outline" className="bg-white/80 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 text-[10px]">
              Wajib Dibayar
            </Badge>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">
            <Money amount={settlement.payable_amount} />
          </div>
          <span className="text-[11px] text-emerald-600/80 dark:text-emerald-300/70 mt-1">
            Hak bersih yang diserahkan ke pemasok
          </span>
        </div>
      </div>

      {/* Item Breakdown Table */}
      <Card className="border border-border shadow-xs">
        <CardHeader className="border-b border-border/80 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm font-bold text-navy-950 dark:text-white">
                Rincian Barang yang Terjual ({settlement.items.length} Produk)
              </CardTitle>
            </div>
            <span className="text-xs text-content-muted">
              Dihitung dari nota transaksi kasir pada periode terkait
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-surface-muted">
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Nama Produk & SKU</TableHead>
                <TableHead className="text-center">Qty Terjual</TableHead>
                <TableHead className="text-right text-emerald-700 dark:text-emerald-400">Harga Titipan</TableHead>
                <TableHead className="text-right">Harga Dijual</TableHead>
                <TableHead className="text-right">Total Omzet</TableHead>
                <TableHead className="text-right text-blue-700 dark:text-blue-300">Komisi Mart</TableHead>
                <TableHead className="text-right font-bold text-emerald-700 dark:text-emerald-300">Hak Pemasok</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlement.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-content-muted text-sm">
                    Tidak ada transaksi barang konsinyasi pada periode ini.
                  </TableCell>
                </TableRow>
              ) : (
                settlement.items.map((item, idx) => {
                  const consignmentPrice = Number(item.qty_sold) > 0 ? Math.round(Number(item.payable) / Number(item.qty_sold)) : 0

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-center text-xs text-content-muted">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-xs text-navy-950 dark:text-white">{item.product.name}</div>
                        <div className="text-[11px] font-mono text-content-muted">SKU: {item.product.sku}</div>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <span className="font-bold">{Number(item.qty_sold)}</span>{' '}
                        <span className="text-[11px] text-content-muted">{item.product.base_unit?.symbol ?? 'pcs'}</span>
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <Money amount={consignmentPrice} size="sm" />
                      </TableCell>
                      <TableCell className="text-right text-xs text-content">
                        <Money amount={item.unit_price} size="sm" />
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        <Money amount={item.total_price} size="sm" />
                      </TableCell>
                      <TableCell className="text-right text-xs text-blue-700 dark:text-blue-300">
                        <Money amount={item.commission} size="sm" />
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        <Money amount={item.payable} size="sm" />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pay Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Pembayaran Settlement</DialogTitle>
            <DialogDescription>
              Pilih akun kas atau rekening bank yang digunakan untuk membayar hak supplier sebesar{' '}
              <span className="font-bold text-content">
                <Money amount={settlement.payable_amount} />
              </span>.
            </DialogDescription>
          </DialogHeader>

          <form id="pay-form" onSubmit={handlePay} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Sumber Akun Kas / Bank</Label>
              <Select
                value={payForm.data.cash_account_id}
                onValueChange={(v) => payForm.setData('cash_account_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih akun kas/bank" />
                </SelectTrigger>
                <SelectContent>
                  {cashAccounts.map((account) => (
                    <SelectItem key={account.id} value={String(account.id)}>
                      {account.name} (Saldo: Rp {Number(account.current_balance).toLocaleString('id-ID')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCashAccount && (
              <div className={`p-3 rounded-lg border text-xs ${
                isInsufficient ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200' : 'bg-surface-muted border-border'
              }`}>
                <div className="flex justify-between">
                  <span>Saldo Akun Terpilih:</span>
                  <span className="font-bold">Rp {Number(selectedCashAccount.current_balance).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Nominal Dibayarkan:</span>
                  <span className="font-bold">Rp {Number(settlement.payable_amount).toLocaleString('id-ID')}</span>
                </div>
                {isInsufficient && (
                  <p className="mt-2 text-rose-600 dark:text-rose-400 font-semibold">
                    Peringatan: Saldo akun kas tidak mencukupi untuk pembayaran ini!
                  </p>
                )}
              </div>
            )}
          </form>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setPayDialogOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="pay-form"
              disabled={payForm.processing || isInsufficient}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Bayar Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Show.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
