import { Link } from '@inertiajs/react'
import type { ReactElement } from 'react'
import { ChevronRight, GraduationCap, History, PlusCircle, Shield, Wallet } from 'lucide-react'
import WaliLayout from '@/Layouts/WaliLayout'
import { Card, CardContent } from '@/Components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/Components/ui/avatar'
import { Money } from '@/Components/common/Money'
import { EmptyState } from '@/Components/common/EmptyState'
import { Button } from '@/Components/ui/button'

type MemberCard = {
  id: number
  name: string
  member_number: string
  class_name: string | null
  balance_cache: number
  photo: string | null
}

type IndexProps = {
  members: MemberCard[]
}

export default function Index({ members }: IndexProps) {
  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Data Anak / Santri
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Kelola saldo, kartu member, dan monitor transaksi anak Anda.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <span className="size-2 rounded-full bg-emerald-500" />
          {members.length} Santri Terdaftar
        </div>
      </div>

      {/* Children Card List */}
      {members.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Belum ada anak terhubung"
          description="Hubungi admin sekolah untuk menghubungkan akun wali Anda ke data anggota anak Anda."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {members.map((member) => (
            <Card
              key={member.id}
              className="overflow-hidden border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar size="lg" className="size-14 border-2 border-amber-500/20 shadow-xs">
                      {member.photo && <AvatarImage src={member.photo} alt={member.name} />}
                      <AvatarFallback className="bg-amber-500/10 font-bold text-amber-700 dark:text-amber-300 text-base">
                        {member.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        {member.name}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        NIS: <strong className="text-slate-700 dark:text-slate-300">{member.member_number}</strong>
                        {member.class_name ? ` • Kelas ${member.class_name}` : ''}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100/80 p-4 dark:from-slate-800/80 dark:to-slate-800/40 border border-slate-200/60 dark:border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400">
                      <Wallet className="size-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Saldo Deposit</span>
                  </div>
                  <Money amount={member.balance_cache} size="lg" className="font-extrabold text-navy-950 dark:text-white" />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button asChild size="default" variant="outline" className="flex-1 gap-2 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-700">
                    <Link href={route('wali.members.show', member.id)}>
                      <History className="size-4" />
                      Detail &amp; Riwayat
                    </Link>
                  </Button>
                  <Button asChild size="default" className="flex-1 gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-navy-950 font-bold shadow-xs">
                    <Link href={route('wali.topup.create')}>
                      <PlusCircle className="size-4" />
                      Top-Up Saldo
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

Index.layout = (page: ReactElement) => <WaliLayout active="anak">{page}</WaliLayout>
