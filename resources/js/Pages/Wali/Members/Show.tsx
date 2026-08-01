import { Link } from '@inertiajs/react'
import type { ReactElement } from 'react'
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import WaliLayout from '@/Layouts/WaliLayout'
import { Card, CardContent } from '@/Components/ui/card'
import { Button } from '@/Components/ui/button'
import { Money } from '@/Components/common/Money'
import { EmptyState } from '@/Components/common/EmptyState'

type RiwayatItem = {
  type: 'belanja' | 'topup'
  reference: string
  date: string
  amount: number
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
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function Show({ member, riwayat }: ShowProps) {
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
    </div>
  )
}

Show.layout = (page: ReactElement) => <WaliLayout active="anak">{page}</WaliLayout>
