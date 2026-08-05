import { type ReactElement } from 'react'
import { Link } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { Card, CardContent } from '@/Components/ui/card'
import { Badge } from '@/Components/ui/badge'
import { EmptyState } from '@/Components/common/EmptyState'

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

const CATEGORY_LABELS: Record<string, string> = {
  penjualan: 'Penjualan',
  stok: 'Stok',
  keuangan: 'Keuangan',
  piutang_hutang: 'Piutang & Hutang',
}
const CATEGORY_ORDER = ['penjualan', 'stok', 'keuangan', 'piutang_hutang']

export default function Index({ reports, financialLinks, exports }: ReportsIndexProps) {
  const byCategory = CATEGORY_ORDER.map((cat) => ({
    key: cat,
    label: CATEGORY_LABELS[cat],
    items: reports.filter((r) => r.category === cat),
  })).filter((group) => group.items.length > 0)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Laporan" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Laporan' }]} />
      {/* Gap G-11: daftar di bawah HANYA berisi laporan yang akun ini
          berwenang membuka — sudah difilter backend (ReportController::
          visibleTo()), bukan sekadar disembunyikan di tampilan. */}
      <p className="text-sm text-content-muted">
        Daftar laporan di bawah otomatis menyesuaikan hak akses akun Anda — laporan yang tidak berwenang Anda buka tidak akan tampil di sini.
      </p>

      {byCategory.length === 0 && financialLinks.length === 0 && (
        <EmptyState title="Tidak ada laporan tersedia" description="Akun Anda belum diberi akses ke laporan apa pun." />
      )}

      {byCategory.map((group) => (
        <div key={group.key} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-content-muted">{group.label}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((report) => (
              <Link key={report.key} href={route('admin.reports.show', report.key)}>
                <Card className="h-full transition-colors hover:border-navy-400">
                  <CardContent className="p-4">
                    <p className="font-medium text-content">{report.title}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {financialLinks.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-content-muted">Laporan Keuangan Lengkap</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {financialLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Card className="h-full transition-colors hover:border-navy-400">
                  <CardContent className="p-4">
                    <p className="font-medium text-content">{link.title}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-content-muted">Ekspor Saya</h2>
        <Card>
          <CardContent className="flex flex-col gap-2 p-4">
            {exports.length === 0 ? (
              <p className="text-sm text-content-muted">Belum ada riwayat ekspor.</p>
            ) : (
              exports.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between gap-2 border-b border-border py-1.5 text-sm last:border-0">
                  <div>
                    <span className="font-medium">{exp.data.report_title}</span>
                    <span className="ml-2 text-content-muted">{exp.data.row_count} baris</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {exp.read_at === null && <Badge className="bg-navy-600 text-white">Baru</Badge>}
                    <a href={exp.data.download_url} className="font-medium text-navy-600 hover:underline" target="_blank" rel="noreferrer">
                      Unduh
                    </a>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
