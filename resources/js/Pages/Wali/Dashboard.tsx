import { Link } from '@inertiajs/react'
import type { ReactElement } from 'react'
import { GraduationCap } from 'lucide-react'
import WaliLayout from '@/Layouts/WaliLayout'
import { Card, CardContent } from '@/Components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/Components/ui/avatar'
import { Money } from '@/Components/common/Money'
import { EmptyState } from '@/Components/common/EmptyState'

type MemberCard = {
  id: number
  name: string
  member_number: string
  class_name: string | null
  balance_cache: number
  photo: string | null
}

type DashboardProps = {
  members: MemberCard[]
}

export default function Dashboard({ members }: DashboardProps) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-content">Beranda</h1>

      {members.length === 0 && (
        <EmptyState
          icon={GraduationCap}
          title="Belum ada anak terhubung"
          description="Hubungi admin sekolah untuk menghubungkan akun wali Anda ke data anggota anak Anda."
        />
      )}

      <div className="flex flex-col gap-3">
        {members.map((member) => (
          <Link key={member.id} href={route('wali.members.show', member.id)}>
            <Card className="transition-colors hover:border-primary">
              <CardContent className="flex items-center gap-3 p-4">
                <Avatar size="lg">
                  {member.photo && <AvatarImage src={member.photo} alt={member.name} />}
                  <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-content">{member.name}</p>
                  <p className="text-xs text-content-muted">
                    {member.member_number}
                    {member.class_name ? ` · ${member.class_name}` : ''}
                  </p>
                </div>
                <Money amount={member.balance_cache} size="lg" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

Dashboard.layout = (page: ReactElement) => <WaliLayout active="beranda">{page}</WaliLayout>
