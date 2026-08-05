import { useState } from 'react'
import { Link, router } from '@inertiajs/react'
import type { ReactElement } from 'react'
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import WaliLayout from '@/Layouts/WaliLayout'
import { Card, CardContent } from '@/Components/ui/card'
import { Button } from '@/Components/ui/button'
import { Badge } from '@/Components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { Money } from '@/Components/common/Money'
import { EmptyState } from '@/Components/common/EmptyState'
import { WeeklyChart, type WeeklyChartPoint } from '@/Components/wali/WeeklyChart'
import { FavoriteProducts, type FavoriteProduct } from '@/Components/wali/FavoriteProducts'

type RiwayatItem = {
  type: 'belanja' | 'topup'
  reference: string
  date: string
  amount: number
}

type CardInfo = {
  status: string
  masked_number: string
  last_used_at: string | null
}

type ShowProps = {
  member: {
    id: number
    name: string
    member_number: string
    class_name: string | null
    balance_cache: number
    photo: string | null
  }
  riwayat: RiwayatItem[]
  weeklyChart: WeeklyChartPoint[]
  favoriteProducts: FavoriteProduct[]
  card: CardInfo | null
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function formatRelative(iso: string | null) {
  if (!iso) return 'Belum pernah dipakai'
  const diffMinutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (diffMinutes < 60) return `${Math.max(diffMinutes, 0)} menit lalu`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} jam lalu`
  return `${Math.round(diffHours / 24)} hari lalu`
}

const cardStatusLabel: Record<string, string> = {
  active: 'Aktif',
  lost: 'Dilaporkan Hilang',
  damaged: 'Rusak',
  blocked: 'Diblokir',
  replaced: 'Diganti',
}

export default function Show({ member, riwayat, weeklyChart, favoriteProducts, card }: ShowProps) {
  const [reportOpen, setReportOpen] = useState(false)
  const [reporting, setReporting] = useState(false)

  function reportLostCard() {
    setReporting(true)
    router.post(route('wali.members.report-lost-card', member.id), {}, {
      preserveScroll: true,
      onFinish: () => {
        setReporting(false)
        setReportOpen(false)
      },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-content">{member.name}</h1>
        <p className="text-sm text-content-muted">
          {member.member_number}
          {member.class_name ? ` · ${member.class_name}` : ''}
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-content-muted">Saldo Saat Ini</p>
          <Money amount={member.balance_cache} size="lg" className="text-2xl" />
        </CardContent>
      </Card>

      <Button asChild className="w-full">
        <Link href={route('wali.topup.create')}>Ajukan Top-Up</Link>
      </Button>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-content-muted">Belanja Mingguan</h2>
        <Card>
          <CardContent className="p-4">
            <WeeklyChart data={weeklyChart} />
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-content-muted">Belanja Favorit Bulan Ini</h2>
        <Card>
          <CardContent className="p-4">
            <FavoriteProducts items={favoriteProducts} />
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-content-muted">Riwayat</h2>
        {riwayat.length === 0 && <EmptyState title="Belum ada riwayat" />}
        <div className="flex flex-col gap-2">
          {riwayat.map((item) => (
            <Card key={`${item.type}-${item.reference}`}>
              <CardContent className="flex items-center gap-3 p-3">
                {item.type === 'topup' ? (
                  <ArrowUpCircle className="size-5 text-success" />
                ) : (
                  <ArrowDownCircle className="size-5 text-danger" />
                )}
                <div className="flex-1">
                  <p className="text-sm text-content">{item.type === 'topup' ? 'Top-Up' : 'Belanja'} · {item.reference}</p>
                  <p className="text-xs text-content-muted">{formatDateTime(item.date)}</p>
                </div>
                <Money amount={item.amount} size="sm" showSign />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {card && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-content-muted">Kartu Member</h2>
          <Card>
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${card.status === 'active' ? 'bg-success' : 'bg-danger'}`} />
                  <p className="text-sm text-content">
                    {cardStatusLabel[card.status] ?? card.status} · No. {card.masked_number}
                  </p>
                </div>
                <Badge variant="outline">{formatRelative(card.last_used_at)}</Badge>
              </div>
              {card.status === 'active' && (
                <Button variant="destructive" size="sm" className="mt-1 w-fit" onClick={() => setReportOpen(true)}>
                  <AlertTriangle className="size-4" />
                  Laporkan Kartu Hilang
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Laporkan Kartu Hilang?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-content-muted">
            Kartu yang dilaporkan hilang akan dinonaktifkan. Admin akan menghubungi Anda untuk proses kartu pengganti.
            Saldo tidak akan hilang.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)} disabled={reporting}>Batal</Button>
            <Button variant="destructive" onClick={reportLostCard} disabled={reporting}>Ya, Laporkan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Show.layout = (page: ReactElement) => <WaliLayout active="anak">{page}</WaliLayout>
