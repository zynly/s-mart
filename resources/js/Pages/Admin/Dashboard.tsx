import { Link, usePage } from '@inertiajs/react'
import type { ReactElement } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'
import { ShoppingCart, Wallet, Cake, PackageX, HandCoins, AlertTriangle } from 'lucide-react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { StatCard } from '@/Components/common/StatCard'
import { Money } from '@/Components/common/Money'
import { EmptyState } from '@/Components/common/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Button } from '@/Components/ui/button'
import { Badge } from '@/Components/ui/badge'
import { useChartColors } from '@/Lib/chartTheme'
import { formatMoney } from '@/Lib/money'
import type { PageProps } from '@/Types'

type CashierSession = {
  reference: string
  opened_at: string
  opening_cash: number
  total_sales_cash: number
  total_sales_deposit: number
  total_sales_noncash: number
  transaction_count: number
} | null

type CashierViewProps = {
  view: 'cashier'
  session: CashierSession
  todayStats: { transaksi: number; omzet: number }
}

type StatCards = {
  omzetHariIni: number
  omzetTrend: number
  labaKotorHariIni: number | null
  transaksiHariIni: number
  rataRataNota: number
}

type Charts = {
  trend30d: { tanggal: string; omzet: number }[]
  byCategory: { kategori: string; total: number }[]
  byPaymentMethod: { metode: string; total: number }[]
  byHour: { jam: number; transaksi: number }[]
}

type Panels = {
  stockAlerts?: { critical: number; expiringSoon: number }
  debtsDue?: number
  receivablesOverdue?: number
  depositLiability?: number
  memberBirthdays?: { name: string; birth_date: string }[]
  reconciliationIssues?: number
}

type ManagerViewProps = {
  view: 'manager'
  statCards?: StatCards
  charts?: Charts
  recentSales?: { reference: string; sale_date: string; grand_total: number; kasir: string | null }[]
  topProducts?: { produk: string; qty: number }[]
  cashierRanking?: { kasir: string; omzet: number }[]
  panels: Panels
}

type DashboardProps = CashierViewProps | ManagerViewProps

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function CashierDashboard({ session, todayStats }: CashierViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {session ? (
              <>
                <p className="text-sm text-content-muted">Sesi berjalan — {session.reference}</p>
                <p className="mt-1 text-lg font-semibold text-content">Dibuka {formatTime(session.opened_at)}</p>
                <p className="mt-1 text-sm text-content-muted">
                  Modal awal <Money amount={session.opening_cash} size="sm" /> · {session.transaction_count} transaksi
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-content-muted">Belum ada sesi berjalan</p>
                <p className="mt-1 text-lg font-semibold text-content">Buka kasir untuk mulai</p>
              </>
            )}
          </div>
          <Button asChild size="lg">
            <Link href={route('pos.index')}>
              <ShoppingCart className="size-4" />
              {session ? 'Lanjut Kasir' : 'Buka Kasir'}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard label="Penjualan Saya Hari Ini" value={formatMoney(todayStats.omzet)} icon={Wallet} />
        <StatCard label="Transaksi Saya Hari Ini" value={String(todayStats.transaksi)} icon={ShoppingCart} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={route('admin.cashier-session.index')}>Sesi &amp; Kas</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={route('admin.deposit.index')}>Top-Up · Cek Saldo</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={route('admin.sale-returns.index')}>Retur</Link>
        </Button>
      </div>
    </div>
  )
}

function TrendChart({ data }: { data: Charts['trend30d'] }) {
  const colors = useChartColors()

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.gridColor} />
        <XAxis dataKey="tanggal" tickFormatter={formatDateShort} stroke={colors.axisColor} fontSize={11} />
        <YAxis stroke={colors.axisColor} fontSize={11} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
        <Tooltip
          contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, fontSize: 12 }}
          labelFormatter={(v) => formatDateShort(String(v))}
          formatter={(v) => [formatMoney(Number(v)), 'Omzet']}
        />
        <Line type="monotone" dataKey="omzet" stroke={colors.palette[0]} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function CategoryChart({ data }: { data: Charts['byCategory'] }) {
  const colors = useChartColors()

  if (data.length === 0) return <EmptyState title="Belum ada penjualan hari ini" />

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="total" nameKey="kategori" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors.palette[i % colors.palette.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, fontSize: 12 }}
          formatter={(v) => formatMoney(Number(v))}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: colors.axisColor }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function PaymentMethodChart({ data }: { data: Charts['byPaymentMethod'] }) {
  const colors = useChartColors()

  if (data.length === 0) return <EmptyState title="Belum ada penjualan hari ini" />

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.gridColor} />
        <XAxis dataKey="metode" stroke={colors.axisColor} fontSize={11} />
        <YAxis stroke={colors.axisColor} fontSize={11} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
        <Tooltip
          contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, fontSize: 12 }}
          formatter={(v) => formatMoney(Number(v))}
        />
        <Bar dataKey="total" fill={colors.palette[0]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function HourChart({ data }: { data: Charts['byHour'] }) {
  const colors = useChartColors()

  if (data.length === 0) return <EmptyState title="Belum ada penjualan hari ini" />

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.gridColor} />
        <XAxis dataKey="jam" tickFormatter={(v: number) => `${v}:00`} stroke={colors.axisColor} fontSize={11} />
        <YAxis stroke={colors.axisColor} fontSize={11} allowDecimals={false} />
        <Tooltip
          contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, fontSize: 12 }}
          labelFormatter={(v) => `Jam ${v}:00`}
          formatter={(v) => [Number(v), 'Transaksi']}
        />
        <Bar dataKey="transaksi" fill={colors.palette[2]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function ManagerDashboard({ statCards, charts, recentSales, topProducts, cashierRanking, panels }: ManagerViewProps) {
  const hasPanels = Object.keys(panels).length > 0

  return (
    <div className="flex flex-col gap-4">
      {statCards && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Penjualan Hari Ini"
            value={formatMoney(statCards.omzetHariIni)}
            icon={Wallet}
            trend={statCards.omzetTrend}
            trendLabel="vs kemarin"
          />
          {statCards.labaKotorHariIni !== null && (
            <StatCard label="Laba Kotor Hari Ini" value={formatMoney(statCards.labaKotorHariIni)} icon={HandCoins} />
          )}
          <StatCard label="Jumlah Transaksi" value={String(statCards.transaksiHariIni)} icon={ShoppingCart} />
          <StatCard label="Rata-rata per Transaksi" value={formatMoney(statCards.rataRataNota)} />
        </div>
      )}

      {charts && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Tren Penjualan 30 Hari</CardTitle></CardHeader>
            <CardContent><TrendChart data={charts.trend30d} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Penjualan per Kategori (Hari Ini)</CardTitle></CardHeader>
            <CardContent><CategoryChart data={charts.byCategory} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Penjualan per Metode Bayar (Hari Ini)</CardTitle></CardHeader>
            <CardContent><PaymentMethodChart data={charts.byPaymentMethod} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Jam Ramai (Hari Ini)</CardTitle></CardHeader>
            <CardContent><HourChart data={charts.byHour} /></CardContent>
          </Card>
        </div>
      )}

      {hasPanels && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-content-muted">Panel Perhatian</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {panels.stockAlerts && (panels.stockAlerts.critical > 0 || panels.stockAlerts.expiringSoon > 0) && (
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-secondary p-2 text-secondary-foreground"><PackageX className="size-5" /></div>
                  <div>
                    <p className="text-sm text-content-muted">Stok</p>
                    <p className="font-medium text-content">
                      {panels.stockAlerts.critical} kritis · {panels.stockAlerts.expiringSoon} akan kadaluwarsa
                    </p>
                    <Link href={route('admin.stock.index')} className="text-xs text-primary hover:underline">Buka Stok</Link>
                  </div>
                </CardContent>
              </Card>
            )}
            {panels.debtsDue !== undefined && panels.debtsDue > 0 && (
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-secondary p-2 text-secondary-foreground"><AlertTriangle className="size-5" /></div>
                  <div>
                    <p className="text-sm text-content-muted">Hutang</p>
                    <p className="font-medium text-content">{panels.debtsDue} jatuh tempo ≤7 hari</p>
                    <Link href={route('admin.debts.index')} className="text-xs text-primary hover:underline">Buka Hutang</Link>
                  </div>
                </CardContent>
              </Card>
            )}
            {panels.receivablesOverdue !== undefined && panels.receivablesOverdue > 0 && (
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-secondary p-2 text-secondary-foreground"><AlertTriangle className="size-5" /></div>
                  <div>
                    <p className="text-sm text-content-muted">Piutang</p>
                    <p className="font-medium text-content">{panels.receivablesOverdue} menunggak</p>
                    <Link href={route('admin.receivables.index')} className="text-xs text-primary hover:underline">Buka Piutang</Link>
                  </div>
                </CardContent>
              </Card>
            )}
            {panels.depositLiability !== undefined && (
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-secondary p-2 text-secondary-foreground"><Wallet className="size-5" /></div>
                  <div>
                    <p className="text-sm text-content-muted">Saldo Deposit Beredar</p>
                    <Money amount={panels.depositLiability} size="lg" />
                  </div>
                </CardContent>
              </Card>
            )}
            {panels.memberBirthdays && panels.memberBirthdays.length > 0 && (
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-secondary p-2 text-secondary-foreground"><Cake className="size-5" /></div>
                  <div>
                    <p className="text-sm text-content-muted">Ulang Tahun (7 hari)</p>
                    <p className="font-medium text-content">{panels.memberBirthdays.map((m) => m.name).join(', ')}</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {panels.reconciliationIssues !== undefined && panels.reconciliationIssues > 0 && (
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-secondary p-2 text-secondary-foreground"><AlertTriangle className="size-5" /></div>
                  <div>
                    <p className="text-sm text-content-muted">Rekonsiliasi Deposit</p>
                    <p className="font-medium text-content">{panels.reconciliationIssues} selisih belum terselesaikan</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {(recentSales || topProducts || cashierRanking) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {recentSales && (
            <Card>
              <CardHeader><CardTitle>Transaksi Terakhir</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2">
                {recentSales.length === 0 && <p className="text-sm text-content-muted">Belum ada transaksi.</p>}
                {recentSales.map((s) => (
                  <div key={s.reference} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-content">{s.reference}</p>
                      <p className="text-xs text-content-muted">{s.kasir} · {formatTime(s.sale_date)}</p>
                    </div>
                    <Money amount={s.grand_total} size="sm" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {topProducts && (
            <Card>
              <CardHeader><CardTitle>Produk Terlaris Minggu Ini</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2">
                {topProducts.length === 0 && <p className="text-sm text-content-muted">Belum ada data.</p>}
                {topProducts.map((p) => (
                  <div key={p.produk} className="flex items-center justify-between text-sm">
                    <p className="text-content">{p.produk}</p>
                    <Badge variant="secondary">{p.qty}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {cashierRanking && (
            <Card>
              <CardHeader><CardTitle>Peringkat Kasir (Hari Ini)</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2">
                {cashierRanking.length === 0 && <p className="text-sm text-content-muted">Belum ada data.</p>}
                {cashierRanking.map((c) => (
                  <div key={c.kasir} className="flex items-center justify-between text-sm">
                    <p className="text-content">{c.kasir}</p>
                    <Money amount={c.omzet} size="sm" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!statCards && !hasPanels && (
        <EmptyState title="Belum ada widget untuk akun Anda" description="Hubungi admin bila Anda merasa seharusnya memiliki akses ke data dashboard." />
      )}
    </div>
  )
}

export default function Dashboard(props: DashboardProps) {
  const { auth } = usePage<PageProps>().props

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Selamat datang, ${auth.user?.name}`} />
      {props.view === 'cashier' ? <CashierDashboard {...props} /> : <ManagerDashboard {...props} />}
    </div>
  )
}

Dashboard.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
