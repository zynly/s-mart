import { Link, usePage } from '@inertiajs/react'
import type { ReactElement } from 'react'
import {
  ArrowDownLeft, ArrowUpRight, ChevronRight, GraduationCap, History, PlusCircle,
  Receipt, ShoppingBag, Users, Wallet,
} from 'lucide-react'
import WaliLayout from '@/Layouts/WaliLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/Components/ui/avatar'
import { Money } from '@/Components/common/Money'
import { EmptyState } from '@/Components/common/EmptyState'
import { Button } from '@/Components/ui/button'
import { formatDateTime } from '@/Lib/date'
import type { PageProps } from '@/Types'

type MemberCard = {
  id: number
  name: string
  member_number: string
  class_name: string | null
  balance_cache: number
  photo: string | null
}

type KpiData = {
  total_balance: number
  today_spent: number
  month_spent: number
  total_children: number
}

type RecentActivity = {
  id: string
  child_name: string
  type: 'belanja' | 'topup'
  title: string
  reference: string
  date: string
  amount: number
}

type DashboardProps = {
  members: MemberCard[]
  kpi?: KpiData
  recentActivities?: RecentActivity[]
}

export default function Dashboard({ members, kpi, recentActivities = [] }: DashboardProps) {
  const { guardianAuth, allowWaliTopup = true } = usePage<PageProps>().props
  const guardianName = guardianAuth?.guardian?.name ?? 'Wali Santri'

  const totalBalance = kpi?.total_balance ?? members.reduce((sum, m) => sum + m.balance_cache, 0)
  const todaySpent = kpi?.today_spent ?? 0
  const monthSpent = kpi?.month_spent ?? 0
  const totalChildren = kpi?.total_children ?? members.length

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      {/* Header Greeting */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Beranda Wali Santri
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Selamat datang kembali, <strong className="text-slate-800 dark:text-slate-200">{guardianName}</strong>
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
          <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
          Akun Aktif Terverifikasi
        </div>
      </div>

      {/* KPI Cards Grid (4 Metric Cards) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* KPI 1: Total Saldo */}
        <Card className="relative overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Saldo Santri</span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400">
                <Wallet className="size-4.5" />
              </div>
            </div>
            <div className="mt-2">
              <Money amount={totalBalance} size="lg" compact className="font-extrabold text-navy-950 dark:text-white" />
            </div>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Saldo siap pakai di kasir S-Mart</p>
          </CardContent>
        </Card>

        {/* KPI 2: Pengeluaran Hari Ini */}
        <Card className="relative overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Belanja Hari Ini</span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-400/20 dark:text-blue-400">
                <ShoppingBag className="size-4.5" />
              </div>
            </div>
            <div className="mt-2">
              <Money amount={todaySpent} size="lg" compact className="font-extrabold text-slate-900 dark:text-white" />
            </div>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Total konsumsi hari ini</p>
          </CardContent>
        </Card>

        {/* KPI 3: Pengeluaran Bulan Ini */}
        <Card className="relative overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Belanja Bulan Ini</span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-400/20 dark:text-purple-400">
                <Receipt className="size-4.5" />
              </div>
            </div>
            <div className="mt-2">
              <Money amount={monthSpent} size="lg" compact className="font-extrabold text-slate-900 dark:text-white" />
            </div>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Akumulasi belanja bulan ini</p>
          </CardContent>
        </Card>

        {/* KPI 4: Jumlah Santri */}
        <Card className="relative overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Santri Terhubung</span>
              <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-400">
                <Users className="size-4.5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">{totalChildren} Santri</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-400">Anak terhubung akun ini</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Shortcut Bar (Hanya jika Top-Up diizinkan) */}
      {allowWaliTopup && (
        <Card className="border-slate-200/80 bg-gradient-to-r from-navy-900 via-navy-800 to-navy-950 text-white shadow-md">
          <CardContent className="flex flex-col gap-4 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-500 text-navy-950 shadow-md">
                <PlusCircle className="size-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Top-Up Saldo Instant</h3>
                <p className="text-xs text-slate-300">Isi saldo dompet santri via QRIS, E-Wallet &amp; Bank Transfer</p>
              </div>
            </div>
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto gap-2 rounded-xl bg-amber-500 font-bold text-navy-950 shadow-md hover:bg-amber-400 active:scale-95 transition-all"
            >
              <Link href={route('wali.topup.create')}>
                Top-Up Sekarang
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Santri / Child List */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Data Anak / Santri</h2>
          <span className="text-xs text-slate-500">{members.length} Anak Terdaftar</span>
        </div>

        {members.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Belum ada anak terhubung"
            description="Hubungi admin sekolah untuk menghubungkan akun wali Anda ke data anggota anak Anda."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {members.map((member) => (
              <Card key={member.id} className="group overflow-hidden border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md hover:border-amber-500/50 dark:border-slate-800 dark:bg-slate-900">
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar size="lg" className="size-11 border border-slate-200 dark:border-slate-700">
                        {member.photo && <AvatarImage src={member.photo} alt={member.name} />}
                        <AvatarFallback className="bg-amber-500/10 font-bold text-amber-700 dark:text-amber-300">
                          {member.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
                          {member.name}
                        </h3>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {member.member_number} {member.class_name ? `• Kelas ${member.class_name}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Saldo Aktif</span>
                    <Money amount={member.balance_cache} size="md" className="font-extrabold text-navy-950 dark:text-white" />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button asChild size="sm" variant="outline" className="flex-1 gap-1.5 rounded-lg text-xs font-semibold">
                      <Link href={route('wali.members.show', member.id)}>
                        <History className="size-3.5" />
                        Riwayat
                      </Link>
                    </Button>
                    <Button asChild size="sm" className="flex-1 gap-1.5 rounded-lg bg-navy-900 hover:bg-navy-950 dark:bg-amber-500 dark:text-navy-950 text-xs font-bold">
                      <Link href={route('wali.topup.create')}>
                        <PlusCircle className="size-3.5" />
                        Top-Up
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity Feed */}
      <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
            Aktivitas Terbaru
          </CardTitle>
          <span className="text-xs text-slate-400 font-normal">5 Transaksi Terakhir</span>
        </CardHeader>
        <CardContent className="p-0">
          {recentActivities.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Belum ada riwayat transaksi terbaru.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentActivities.map((act) => {
                const isTopup = act.type === 'topup'
                const Icon = isTopup ? ArrowUpRight : ArrowDownLeft

                return (
                  <div key={act.id} className="flex items-center justify-between p-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                        isTopup
                          ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-400'
                          : 'bg-amber-500/10 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400'
                      }`}>
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                          {act.title}
                        </p>
                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {act.child_name} • {formatDateTime(act.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs sm:text-sm font-bold ${
                        isTopup ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                      }`}>
                        {isTopup ? '+' : ''}<Money amount={act.amount} size="sm" inline />
                      </span>
                      <p className="text-[10px] text-slate-400 uppercase font-mono">{act.reference}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

Dashboard.layout = (page: ReactElement) => <WaliLayout active="beranda">{page}</WaliLayout>
