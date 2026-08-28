import { Link, usePage } from '@inertiajs/react'
import type { ReactElement } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'
import { ShoppingCart, Wallet, PackageX, HandCoins, AlertTriangle, Receipt, CreditCard, Scale, Users, ArrowUpRight, Trophy, Package, Sparkles } from 'lucide-react'
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
  saldoDeposit?: number
}

type Charts = {
  trend30d: { tanggal: string; omzet: number }[]
  byCategory: { kategori: string; total: number }[]
  byPaymentMethod: { metode: string; total: number }[]
  byHour: { jam: number; transaksi: number }[]
}

export type MemberSpender = {
  id: number
  name: string
  member_number: string
  class_name: string | null
  major: string | null
  total_transaksi: number
  total_belanja: number
}

export type MemberDebtor = {
  id: number
  name: string
  member_number: string
  class_name: string | null
  major: string | null
  total_bon: number
  total_hutang: number
}

type Panels = {
  stockAlerts?: { critical: number; expiringSoon: number }
  debtsDue?: number
  receivablesOverdue?: number
  totalMembers?: number
  reconciliationIssues?: number
  topSpenders?: MemberSpender[]
  debtors?: MemberDebtor[]
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
      <Card className="border-amber-200/80 bg-gradient-to-r from-amber-500/10 via-white to-white dark:from-amber-950/20 dark:via-surface dark:to-surface shadow-xs rounded-2xl overflow-hidden">
        <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {session ? (
              <>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Sesi Kasir Aktif — {session.reference}</p>
                <p className="mt-1 text-xl font-extrabold text-navy-950 dark:text-white">Dibuka Pukul {formatTime(session.opened_at)}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Modal awal <Money amount={session.opening_cash} size="sm" /> · Total {session.transaction_count} Transaksi
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Status Sesi</p>
                <p className="mt-1 text-xl font-extrabold text-navy-950 dark:text-white">Belum Ada Sesi Kasir Aktif</p>
                <p className="mt-1 text-xs text-slate-500">Buka sesi kasir untuk mulai memproses transaksi POS.</p>
              </>
            )}
          </div>
          <Button asChild size="lg" className="bg-amber-400 hover:bg-amber-500 text-navy-950 font-black shadow-md shadow-amber-400/20 rounded-xl">
            <Link href={route('pos.index')}>
              <ShoppingCart className="size-4 mr-1.5" />
              {session ? 'Lanjut Kasir POS' : 'Buka Kasir POS'}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Penjualan Saya Hari Ini" value={formatMoney(todayStats.omzet)} icon={Wallet} color="emerald" />
        <StatCard label="Transaksi Saya Hari Ini" value={String(todayStats.transaksi)} icon={ShoppingCart} color="blue" />
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Button asChild variant="outline" className="rounded-xl font-bold border-slate-200 dark:border-slate-800">
          <Link href={route('admin.cashier-session.index')}>Sesi &amp; Kas</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl font-bold border-slate-200 dark:border-slate-800">
          <Link href={route('admin.deposit.index')}>Top-Up · Cek Saldo</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl font-bold border-slate-200 dark:border-slate-800">
          <Link href={route('admin.sale-returns.index')}>Retur Penjualan</Link>
        </Button>
      </div>
    </div>
  )
}

function TrendChart({ data }: { data: Charts['trend30d'] }) {
  const colors = useChartColors()

  return (
    <ResponsiveContainer width="100%" height={230}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.gridColor} />
        <XAxis dataKey="tanggal" tickFormatter={formatDateShort} stroke={colors.axisColor} fontSize={11} />
        <YAxis stroke={colors.axisColor} fontSize={11} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
        <Tooltip
          contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '12px', fontSize: 12, fontWeight: 'bold' }}
          labelFormatter={(v) => formatDateShort(String(v))}
          formatter={(v) => [formatMoney(Number(v)), 'Omzet']}
        />
        <Line type="monotone" dataKey="omzet" stroke={colors.palette[0]} strokeWidth={3} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function CategoryChart({ data }: { data: Charts['byCategory'] }) {
  const colors = useChartColors()

  if (data.length === 0) return <EmptyState title="Belum ada penjualan hari ini" />

  return (
    <ResponsiveContainer width="100%" height={230}>
      <PieChart>
        <Pie data={data} dataKey="total" nameKey="kategori" innerRadius={50} outerRadius={80} paddingAngle={3}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors.palette[i % colors.palette.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '12px', fontSize: 12, fontWeight: 'bold' }}
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
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.gridColor} />
        <XAxis dataKey="metode" stroke={colors.axisColor} fontSize={11} />
        <YAxis stroke={colors.axisColor} fontSize={11} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
        <Tooltip
          contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '12px', fontSize: 12, fontWeight: 'bold' }}
          formatter={(v) => formatMoney(Number(v))}
        />
        <Bar dataKey="total" fill={colors.palette[0]} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function HourChart({ data }: { data: Charts['byHour'] }) {
  const colors = useChartColors()

  if (data.length === 0) return <EmptyState title="Belum ada penjualan hari ini" />

  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.gridColor} />
        <XAxis dataKey="jam" tickFormatter={(v: number) => `${v}:00`} stroke={colors.axisColor} fontSize={11} />
        <YAxis stroke={colors.axisColor} fontSize={11} allowDecimals={false} />
        <Tooltip
          contentStyle={{ backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: '12px', fontSize: 12, fontWeight: 'bold' }}
          labelFormatter={(v) => `Jam ${v}:00`}
          formatter={(v) => [Number(v), 'Transaksi']}
        />
        <Bar dataKey="transaksi" fill={colors.palette[2]} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function ManagerDashboard({ statCards, charts, recentSales, topProducts, cashierRanking, panels }: ManagerViewProps) {
  const hasPanels = Object.keys(panels).length > 0

  return (
    <div className="flex flex-col gap-5">
      {/* 1. TOP ROW: Modern Executive KPI Cards */}
      {statCards && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Penjualan Hari Ini"
            value={formatMoney(statCards.omzetHariIni)}
            icon={Wallet}
            trend={statCards.omzetTrend}
            trendLabel="vs kemarin"
            color="emerald"
          />
          <StatCard
            label="Laba Kotor Hari Ini"
            value={statCards.labaKotorHariIni !== null ? formatMoney(statCards.labaKotorHariIni) : '-'}
            icon={HandCoins}
            color="amber"
          />
          <StatCard
            label="Jumlah Transaksi"
            value={String(statCards.transaksiHariIni)}
            icon={ShoppingCart}
            color="blue"
          />
          <StatCard
            label="Rata-rata per Transaksi"
            value={formatMoney(statCards.rataRataNota)}
            icon={Receipt}
            color="indigo"
          />
          <StatCard
            label="Saldo Deposit Beredar"
            value={formatMoney(statCards.saldoDeposit ?? 0)}
            icon={CreditCard}
            color="purple"
          />
        </div>
      )}

      {/* 2. MIDDLE ROW: Styled Operational Warning & Metric Cards */}
      {hasPanels && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {panels.stockAlerts && (
            <div className="group flex flex-col justify-between rounded-2xl border border-rose-200/90 dark:border-rose-800/80 bg-rose-50/70 dark:bg-rose-950/20 p-4 shadow-2xs hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/20 shrink-0">
                  <PackageX className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-400">Stok Barang</p>
                  <p className="text-xs font-bold text-navy-950 dark:text-white mt-0.5 truncate">
                    {panels.stockAlerts.critical} kritis · {panels.stockAlerts.expiringSoon} kadaluwarsa
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-rose-200/60 dark:border-rose-800/60 pt-2.5">
                <span className="text-[10px] font-bold text-slate-500">Peringatan FEFO</span>
                <Link href={route('admin.stock.index')} className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Buka Stok</span>
                  <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </div>
          )}

          {panels.debtsDue !== undefined && (
            <div className="group flex flex-col justify-between rounded-2xl border border-amber-200/90 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/20 p-4 shadow-2xs hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20 shrink-0">
                  <AlertTriangle className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">Hutang Supplier</p>
                  <p className="text-xs font-bold text-navy-950 dark:text-white mt-0.5 truncate">
                    {panels.debtsDue} jatuh tempo
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-amber-200/60 dark:border-amber-800/60 pt-2.5">
                <span className="text-[10px] font-bold text-slate-500">Aging Utang</span>
                <Link href={route('admin.debts.index')} className="text-xs font-extrabold text-amber-700 dark:text-amber-400 hover:text-amber-900 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Buka Hutang</span>
                  <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </div>
          )}

          {panels.receivablesOverdue !== undefined && (
            <div className="group flex flex-col justify-between rounded-2xl border border-orange-200/90 dark:border-orange-800/80 bg-orange-50/70 dark:bg-orange-950/20 p-4 shadow-2xs hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-500/20 shrink-0">
                  <Scale className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-orange-700 dark:text-orange-400">Piutang Anggota</p>
                  <p className="text-xs font-bold text-navy-950 dark:text-white mt-0.5 truncate">
                    {panels.receivablesOverdue} menunggak
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-orange-200/60 dark:border-orange-800/60 pt-2.5">
                <span className="text-[10px] font-bold text-slate-500">Tagihan Bon</span>
                <Link href={route('admin.receivables.index')} className="text-xs font-extrabold text-orange-700 dark:text-orange-400 hover:text-orange-900 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Buka Piutang</span>
                  <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </div>
          )}

          {panels.totalMembers !== undefined && (
            <div className="group flex flex-col justify-between rounded-2xl border border-teal-200/90 dark:border-teal-800/80 bg-teal-50/70 dark:bg-teal-950/20 p-4 shadow-2xs hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md shadow-teal-600/20 shrink-0">
                  <Users className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700 dark:text-teal-400">Santri Aktif</p>
                  <p className="text-xs font-bold text-navy-950 dark:text-white mt-0.5 truncate">
                    {panels.totalMembers} Santri
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-teal-200/60 dark:border-teal-800/60 pt-2.5">
                <span className="text-[10px] font-bold text-slate-500">Anggota</span>
                <Link href={route('admin.members.index')} className="text-xs font-extrabold text-teal-700 dark:text-teal-400 hover:text-teal-900 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Buka Santri</span>
                  <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </div>
          )}

          {panels.reconciliationIssues !== undefined && (
            <div className="group flex flex-col justify-between rounded-2xl border border-emerald-200/90 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/20 p-4 shadow-2xs hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 shrink-0">
                  <CreditCard className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Rekonsiliasi Deposit</p>
                  <p className="text-xs font-bold text-navy-950 dark:text-white mt-0.5 truncate">
                    {panels.reconciliationIssues} selisih
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-emerald-200/60 dark:border-emerald-800/60 pt-2.5">
                <span className="text-[10px] font-bold text-slate-500">Saldo Deposit</span>
                <Badge variant="outline" className="font-mono text-[10px] font-bold bg-white text-emerald-700 border-emerald-300">
                  {panels.reconciliationIssues === 0 ? '✓ Balanced' : 'Perlu Cek'}
                </Badge>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. BOTTOM ROW: Modern Content Cards with Icons */}
      {(recentSales || topProducts || cashierRanking) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {recentSales && (
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardHeader className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-navy-950 dark:text-white flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <Receipt className="size-4" />
                  </div>
                  <span>Transaksi Terakhir</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-3">
                {recentSales.length === 0 && <EmptyState title="Belum ada transaksi" />}
                {recentSales.map((s) => (
                  <div key={s.reference} className="flex items-center justify-between text-xs py-2 px-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-surface-alt transition-colors">
                    <div>
                      <p className="font-mono font-bold text-navy-950 dark:text-white">{s.reference}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{s.kasir ?? 'Kasir POS'} · {formatTime(s.sale_date)}</p>
                    </div>
                    <Money amount={s.grand_total} size="sm" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {topProducts && (
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardHeader className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-navy-950 dark:text-white flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <Package className="size-4" />
                  </div>
                  <span>Produk Terlaris Minggu Ini</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-3">
                {topProducts.length === 0 && <EmptyState title="Belum ada data penjualan" />}
                {topProducts.map((p, idx) => (
                  <div key={p.produk} className="flex items-center justify-between text-xs py-2 px-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-surface-alt transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-mono font-extrabold text-slate-700">
                        #{idx + 1}
                      </span>
                      <p className="font-bold text-navy-950 dark:text-white truncate max-w-[150px]">{p.produk}</p>
                    </div>
                    <Badge className="bg-blue-600 text-white font-mono font-bold text-[10px]">{p.qty} Terjual</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {cashierRanking && (
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardHeader className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-navy-950 dark:text-white flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <Trophy className="size-4" />
                  </div>
                  <span>Peringkat Kasir (Hari Ini)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-3">
                {cashierRanking.length === 0 && <EmptyState title="Belum ada transaksi kasir" />}
                {cashierRanking.map((c, idx) => (
                  <div key={c.kasir} className="flex items-center justify-between text-xs py-2 px-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-surface-alt transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/60 text-[10px] font-mono font-black text-amber-800 dark:text-amber-300">
                        #{idx + 1}
                      </span>
                      <p className="font-bold text-navy-950 dark:text-white">{c.kasir}</p>
                    </div>
                    <Money amount={c.omzet} size="sm" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 3.5. MEMBERS HIGHLIGHT ROW: Orang yang Sering Jajan & Orang yang Hutang */}
      {(panels.topSpenders || panels.debtors) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {panels.topSpenders && (
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardHeader className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-navy-950 dark:text-white flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                    <Sparkles className="size-4" />
                  </div>
                  <span>Santri / Anggota Paling Sering Jajan (Top Spenders)</span>
                </CardTitle>
                <Link href={route('admin.members.index')} className="text-[11px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-0.5">
                  <span>Lihat Semua</span>
                  <ArrowUpRight className="size-3" />
                </Link>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-3">
                {panels.topSpenders.length === 0 && <EmptyState title="Belum ada data transaksi anggota" />}
                {panels.topSpenders.map((m, idx) => (
                  <div key={m.id} className="flex items-center justify-between text-xs py-2 px-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-surface-alt transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-6 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-950/60 text-[10px] font-mono font-black text-teal-800 dark:text-teal-300">
                        #{idx + 1}
                      </span>
                      <div>
                        <p className="font-bold text-navy-950 dark:text-white flex items-center gap-1.5">
                          <span>{m.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">({m.member_number})</span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {m.class_name ? `Kelas ${m.class_name}` : ''} {m.major ? `· ${m.major}` : ''} · <span className="font-bold text-teal-700 dark:text-teal-400">{m.total_transaksi}x Transaksi</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Money amount={m.total_belanja} size="sm" className="font-extrabold text-teal-600 dark:text-teal-400" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {panels.debtors && (
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <CardHeader className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-navy-950 dark:text-white flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
                    <Scale className="size-4" />
                  </div>
                  <span>Anggota Memiliki Tanggungan Piutang / Hutang</span>
                </CardTitle>
                <Link href={route('admin.receivables.index')} className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-0.5">
                  <span>Buka Piutang</span>
                  <ArrowUpRight className="size-3" />
                </Link>
              </CardHeader>
              <CardContent className="p-4 flex flex-col gap-3">
                {panels.debtors.length === 0 && <EmptyState title="Tidak ada anggota yang memiliki tunggakan piutang" />}
                {panels.debtors.map((d, idx) => (
                  <div key={d.id} className="flex items-center justify-between text-xs py-2 px-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-surface-alt transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-6 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950/60 text-[10px] font-mono font-black text-orange-800 dark:text-orange-300">
                        #{idx + 1}
                      </span>
                      <div>
                        <p className="font-bold text-navy-950 dark:text-white flex items-center gap-1.5">
                          <span>{d.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">({d.member_number})</span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {d.class_name ? `Kelas ${d.class_name}` : ''} {d.major ? `· ${d.major}` : ''} · <span className="font-bold text-orange-700 dark:text-orange-400">{d.total_bon} Nota Bon</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Money amount={d.total_hutang} size="sm" className="font-extrabold text-rose-600 dark:text-rose-400" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 4. CHARTS ROW */}
      {charts && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <CardHeader><CardTitle className="text-xs font-extrabold uppercase tracking-wider">Tren Penjualan 30 Hari</CardTitle></CardHeader>
            <CardContent><TrendChart data={charts.trend30d} /></CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <CardHeader><CardTitle className="text-xs font-extrabold uppercase tracking-wider">Penjualan per Kategori (Hari Ini)</CardTitle></CardHeader>
            <CardContent><CategoryChart data={charts.byCategory} /></CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <CardHeader><CardTitle className="text-xs font-extrabold uppercase tracking-wider">Penjualan per Metode Bayar (Hari Ini)</CardTitle></CardHeader>
            <CardContent><PaymentMethodChart data={charts.byPaymentMethod} /></CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <CardHeader><CardTitle className="text-xs font-extrabold uppercase tracking-wider">Jam Ramai (Hari Ini)</CardTitle></CardHeader>
            <CardContent><HourChart data={charts.byHour} /></CardContent>
          </Card>
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
