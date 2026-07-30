import { Link, usePage } from '@inertiajs/react'
import type { ReactElement } from 'react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import type { PageProps } from '@/Types'

/**
 * Placeholder sementara — dashboard penuh (stat card, tren, panel
 * perhatian per role) dibangun di Fase 15. Halaman ini hanya jadi
 * titik pendaratan setelah login sampai Fase 15 selesai.
 */
export default function Dashboard() {
  const { auth } = usePage<PageProps>().props

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Selamat datang, ${auth.user?.name}`} subtitle="Dashboard lengkap menyusul di Fase 15" />
      <Card>
        <CardHeader>
          <CardTitle>Menu Cepat</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href={route('admin.users.index')} className="text-primary hover:underline">
            Pengguna
          </Link>
          <Link href={route('admin.roles.index')} className="text-primary hover:underline">
            Role &amp; Izin
          </Link>
          <Link href={route('admin.activity-logs.index')} className="text-primary hover:underline">
            Log Aktivitas
          </Link>
          <Link href={route('profile.edit')} className="text-primary hover:underline">
            Profil Saya
          </Link>
          <Link href="/uji-komponen" className="text-primary hover:underline">
            Uji Komponen
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

Dashboard.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
