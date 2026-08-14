import { useState, type ReactElement } from 'react'
import { Link } from '@inertiajs/react'
import {
  ShoppingBag, Package, Wallet, Scale, Download, FileSpreadsheet, ArrowRight,
  TrendingUp, BarChart3, Clock, AlertTriangle, Layers, Calendar, CheckCircle2, Store,
} from 'lucide-react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { Card, CardContent } from '@/Components/ui/card'
import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/Components/ui/tabs'
import { EmptyState } from '@/Components/common/EmptyState'
import { formatDate } from '@/Lib/date'

type ReportEntry = { key: string; title: string; category: string }
type FinancialLink = { title: string; href: string }
type ExportEntry = {
  id: string
  data: { title: string; report_title: string; download_url: string; row_count: number }
  read_at: string | null
  created_at: string
}

type ReportsIndexProps = {
  reports: ReportEntry[]
  financialLinks: FinancialLink[]
  exports: ExportEntry[]
}

const REPORT_DESCRIPTIONS: Record<string, string> = {
  'sales-summary': 'Ringkasan total omzet, laba kotor, dan jumlah transaksi harian/periodik.',
  'sales-by-product': 'Rincian volume dan nilai penjualan per jenis barang/produk.',
  'sales-by-cashier': 'Laporan omzet dan performa transaksi per petugas kasir.',
  'cashier-sessions': 'Audit detail sesi kasir, kas awal, expected cash, actual cash, dan selisih.',
  'sales-by-payment-method': 'Breakdown pembayaran via Tunai, QRIS, maupun Deposit Santri.',
  'stock-summary': 'Ringkasan posisi nilai dan kuantitas persediaan barang terkini.',
  'stock-card': 'Kartu riwayat mutasi masuk, keluar, dan penyesuaian stok produk.',
  'stock-critical-expiry': 'Daftar produk dengan stok di bawah batas minimal atau mendekati expired.',
  'cash-ledger': 'Buku mutasi arus kas masuk dan keluar operasional kasir/toko.',
  'receivable-aging': 'Analisis umur piutang santri/pelanggan yang jatuh tempo.',
  'debt-aging': 'Analisis umur tagihan hutang toko kepada supplier/vendor.',
}

const REPORT_ICONS: Record<string, typeof ShoppingBag> = {
  'sales-summary': TrendingUp,
  'sales-by-product': Layers,
  'sales-by-cashier': BarChart3,
  'cashier-sessions': Store,
  'sales-by-payment-method': Wallet,
  'stock-summary': Package,
  'stock-card': Clock,
  'stock-critical-expiry': AlertTriangle,
  'cash-ledger': Wallet,
  'receivable-aging': Scale,
  'debt-aging': Scale,
}

export default function Index({ reports, financialLinks, exports }: ReportsIndexProps) {
  const [activeTab, setActiveTab] = useState('penjualan')

  const penjualanReports = reports.filter((r) => r.category === 'penjualan')
  const stokReports = reports.filter((r) => r.category === 'stok')
  const keuanganReports = reports.filter((r) => r.category === 'keuangan')
  const piutangReports = reports.filter((r) => r.category === 'piutang_hutang')

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Laporan & Analitik"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Laporan' }]}
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900 shadow-xs">
        <p className="font-medium">✨ Akses Laporan Terintegrasi</p>
        <p className="mt-0.5 text-xs text-amber-700">
          Daftar laporan otomatis menyesuaikan hak akses akun Anda. Anda dapat membuka laporan atau mengunduh riwayat ekspor XLSX/PDF di bawah.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto p-1 bg-muted/60 rounded-xl gap-1">
          <TabsTrigger value="penjualan" className="flex items-center justify-center gap-2 py-2.5 font-bold text-center data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <ShoppingBag className="size-4 text-emerald-600 shrink-0" />
            <span>Penjualan</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">{penjualanReports.length}</Badge>
          </TabsTrigger>

          <TabsTrigger value="stok" className="flex items-center justify-center gap-2 py-2.5 font-bold text-center data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Package className="size-4 text-blue-600 shrink-0" />
            <span>Stok &amp; Barang</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">{stokReports.length}</Badge>
          </TabsTrigger>

          <TabsTrigger value="keuangan" className="flex items-center justify-center gap-2 py-2.5 font-bold text-center data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Wallet className="size-4 text-indigo-600 shrink-0" />
            <span>Keuangan</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">{keuanganReports.length + financialLinks.length}</Badge>
          </TabsTrigger>

          <TabsTrigger value="piutang_hutang" className="flex items-center justify-center gap-2 py-2.5 font-bold text-center data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Scale className="size-4 text-amber-600 shrink-0" />
            <span>Hutang Piutang</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">{piutangReports.length}</Badge>
          </TabsTrigger>

          <TabsTrigger value="exports" className="flex items-center justify-center gap-2 py-2.5 font-bold text-center data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Download className="size-4 text-purple-600 shrink-0" />
            <span>Ekspor Saya</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">{exports.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Tab Penjualan */}
        <TabsContent value="penjualan" className="mt-4">
          {penjualanReports.length === 0 ? (
            <EmptyState title="Tidak ada laporan penjualan" description="Anda belum memiliki akses ke laporan penjualan." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
              {penjualanReports.map((r) => {
                const IconComponent = REPORT_ICONS[r.key] ?? ShoppingBag
                return (
                  <Card key={r.key} className="group relative overflow-hidden transition-all duration-200 hover:border-emerald-500 hover:shadow-md">
                    <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                          <IconComponent className="size-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-base text-navy-950">{r.title}</h3>
                          <p className="mt-1 text-xs text-content-muted leading-relaxed">
                            {REPORT_DESCRIPTIONS[r.key] ?? 'Laporan terstruktur analisis modul penjualan.'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                          <Link href={route('admin.reports.show', r.key)}>
                            <span>Buka Laporan</span>
                            <ArrowRight className="size-3.5 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab Stok */}
        <TabsContent value="stok" className="mt-4">
          {stokReports.length === 0 ? (
            <EmptyState title="Tidak ada laporan stok" description="Anda belum memiliki akses ke laporan persediaan stok." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
              {stokReports.map((r) => {
                const IconComponent = REPORT_ICONS[r.key] ?? Package
                return (
                  <Card key={r.key} className="group relative overflow-hidden transition-all duration-200 hover:border-blue-500 hover:shadow-md">
                    <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                          <IconComponent className="size-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-base text-navy-950">{r.title}</h3>
                          <p className="mt-1 text-xs text-content-muted leading-relaxed">
                            {REPORT_DESCRIPTIONS[r.key] ?? 'Laporan rincian posisi stok dan persediaan barang.'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                          <Link href={route('admin.reports.show', r.key)}>
                            <span>Buka Laporan</span>
                            <ArrowRight className="size-3.5 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab Keuangan */}
        <TabsContent value="keuangan" className="mt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {keuanganReports.map((r) => {
              const IconComponent = REPORT_ICONS[r.key] ?? Wallet
              return (
                <Card key={r.key} className="group relative overflow-hidden transition-all duration-200 hover:border-indigo-500 hover:shadow-md">
                  <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                        <IconComponent className="size-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-base text-navy-950">{r.title}</h3>
                        <p className="mt-1 text-xs text-content-muted leading-relaxed">
                          {REPORT_DESCRIPTIONS[r.key] ?? 'Laporan mutasi arus kas dan keuangan.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                      <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                        <Link href={route('admin.reports.show', r.key)}>
                          <span>Buka Laporan</span>
                          <ArrowRight className="size-3.5 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {financialLinks.map((link) => (
              <Card key={link.href} className="group relative overflow-hidden transition-all duration-200 hover:border-indigo-500 hover:shadow-md">
                <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                      <BarChart3 className="size-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-base text-navy-950">{link.title}</h3>
                      <p className="mt-1 text-xs text-content-muted leading-relaxed">
                        Laporan keuangan resmi neraca dan rincian laba rugi operasional toko.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <Button asChild size="sm" variant="outline" className="font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                      <Link href={link.href}>
                        <span>Buka Laporan Keuangan</span>
                        <ArrowRight className="size-3.5 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab Piutang & Hutang */}
        <TabsContent value="piutang_hutang" className="mt-4">
          {piutangReports.length === 0 ? (
            <EmptyState title="Tidak ada laporan hutang piutang" description="Anda belum memiliki akses ke modul hutang piutang." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
              {piutangReports.map((r) => {
                const IconComponent = REPORT_ICONS[r.key] ?? Scale
                return (
                  <Card key={r.key} className="group relative overflow-hidden transition-all duration-200 hover:border-amber-500 hover:shadow-md">
                    <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0">
                          <IconComponent className="size-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-base text-navy-950">{r.title}</h3>
                          <p className="mt-1 text-xs text-content-muted leading-relaxed">
                            {REPORT_DESCRIPTIONS[r.key] ?? 'Analisis saldo jatuh tempo dan tagihan.'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                          <Link href={route('admin.reports.show', r.key)}>
                            <span>Buka Laporan</span>
                            <ArrowRight className="size-3.5 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab Ekspor Saya */}
        <TabsContent value="exports" className="mt-4">
          <Card>
            <CardContent className="p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-base text-navy-950 flex items-center gap-2">
                  <FileSpreadsheet className="size-5 text-emerald-600" />
                  <span>Riwayat Berkas Ekspor XLSX / PDF</span>
                </h3>
                <Badge variant="outline" className="font-mono text-xs">{exports.length} Berkas</Badge>
              </div>

              {exports.length === 0 ? (
                <EmptyState title="Belum ada riwayat ekspor" description="Berkas laporan yang Anda ekspor akan tersimpan di sini." />
              ) : (
                <div className="divide-y divide-slate-100">
                  {exports.map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between gap-3 py-3 text-sm hover:bg-slate-50/50 px-2 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                          <FileSpreadsheet className="size-4" />
                        </div>
                        <div>
                          <p className="font-bold text-navy-950">{exp.data.report_title}</p>
                          <p className="text-xs text-content-muted flex items-center gap-2 mt-0.5">
                            <span>{exp.data.row_count} baris data</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              {formatDate(exp.created_at)}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {exp.read_at === null && (
                          <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                            <CheckCircle2 className="size-3 mr-1" />
                            Siap
                          </Badge>
                        )}
                        <Button asChild size="sm" variant="outline" className="font-bold text-navy-700 border-slate-300 hover:bg-slate-100">
                          <a href={exp.data.download_url} target="_blank" rel="noreferrer">
                            <Download className="size-3.5 mr-1 text-emerald-600" />
                            Unduh Berkas
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>

