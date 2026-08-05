import { useEffect, useState } from 'react'
import { useForm } from '@inertiajs/react'
import { AlertTriangle } from 'lucide-react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/Components/ui/alert'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Checkbox } from '@/Components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { formatDateTime } from '@/Lib/date'

type Backup = { name: string; size: number; created_at: string }

type DangerZoneProps = {
  storeName: string
  backups: Backup[]
}

const CONFIRM_HOLD_SECONDS = 5

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function DangerZone({ storeName, backups }: DangerZoneProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [understood, setUnderstood] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(CONFIRM_HOLD_SECONDS)
  const form = useForm({ confirm_name: '', password: '' })

  useEffect(() => {
    if (!dialogOpen) return
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [dialogOpen])

  function openDialog() {
    form.reset()
    form.clearErrors()
    setUnderstood(false)
    setSecondsLeft(CONFIRM_HOLD_SECONDS)
    setDialogOpen(true)
  }

  function submit() {
    form.post(route('admin.settings.reset-transactions'), {
      onSuccess: () => setDialogOpen(false),
    })
  }

  const canSubmit = understood && secondsLeft === 0 && form.data.confirm_name === storeName && form.data.password.length > 0

  return (
    <AdminLayout>
      <PageHeader
        title="Pengaturan"
        subtitle="Zona berbahaya — aksi di sini tidak bisa dibatalkan"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Pengaturan' }, { label: 'Danger Zone' }]}
      />
      <PageTabs current="danger-zone" tabs={[
        { key: 'settings', label: 'Pengaturan', href: route('admin.settings.index'), permission: 'setting.view' },
        { key: 'danger-zone', label: 'Danger Zone', href: route('admin.settings.danger-zone'), permission: 'system.reset' },
      ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Cadangan Terbaru</CardTitle>
          <CardDescription>Backup harian otomatis (02:00) — daftar file cadangan di server.</CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <p className="text-sm text-content-muted">Belum ada file cadangan.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {backups.map((b) => (
                <li key={b.name} className="flex items-center justify-between py-2">
                  <span className="font-mono">{b.name}</span>
                  <span className="text-content-muted">{formatSize(b.size)} · {formatDateTime(b.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="ring-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Reset Data Transaksi</CardTitle>
          <CardDescription>
            Menghapus permanen seluruh transaksi (penjualan, pembelian, deposit, jurnal, stok, dll).
            Data master (produk, anggota, akun pengguna) dan pengaturan TIDAK terhapus.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle />
            <AlertTitle>Tidak bisa dibatalkan</AlertTitle>
            <AlertDescription>
              Sistem akan membuat cadangan otomatis sebelum menghapus, tapi memulihkannya butuh
              intervensi manual di server. Pastikan ini benar-benar dibutuhkan.
            </AlertDescription>
          </Alert>
          <Button variant="destructive" onClick={openDialog}>Reset Data Transaksi</Button>
        </CardContent>
      </Card>

      {/* Gap G-04: sengaja HANYA informasi, tidak ada tombol/form di sini
          — reset total (termasuk data master & akun pengguna) memang
          tidak dibangun sebagai aksi web, lihat penjelasan di bawah. */}
      <Card className="ring-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Reset Total Sistem</CardTitle>
          <CardDescription>
            Menghapus SEMUA data — termasuk transaksi, produk, anggota, akun pengguna, dan pengaturan —
            lalu mengembalikan sistem ke kondisi data awal seeder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Tidak tersedia sebagai tombol di halaman ini — disengaja</AlertTitle>
            <AlertDescription>
              Berbeda dari &quot;Reset Data Transaksi&quot; di atas, reset total tidak bisa dipicu lewat
              browser oleh siapa pun. Ini hanya bisa dijalankan developer/administrator server lewat
              command-line: <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-xs">php artisan system:reset-total</code>.
              Perintah itu mewajibkan konfirmasi berlapis (ketik nama aplikasi, konfirmasi eksplisit,
              dan frasa tambahan khusus di server produksi), membuat cadangan otomatis terlebih dahulu,
              dan mencatat setiap eksekusinya ke log sistem &amp; log aktivitas. Hubungi developer/admin
              server jika toko benar-benar membutuhkan ini.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Reset Data Transaksi</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm_name">Ketik nama toko persis: <span className="font-semibold">{storeName}</span></Label>
              <Input id="confirm_name" value={form.data.confirm_name} onChange={(e) => form.setData('confirm_name', e.target.value)} />
              {form.errors.confirm_name && <p className="text-xs text-destructive">{form.errors.confirm_name}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password Anda</Label>
              <Input id="password" type="password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} />
              {form.errors.password && <p className="text-xs text-destructive">{form.errors.password}</p>}
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="understood" checked={understood} onCheckedChange={(v) => setUnderstood(v === true)} className="mt-0.5" />
              <Label htmlFor="understood" className="font-normal text-content-muted">
                Saya paham seluruh riwayat transaksi akan terhapus permanen dan tidak bisa dikembalikan lewat aplikasi.
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={submit} disabled={!canSubmit || form.processing}>
              {secondsLeft > 0 ? `Tunggu ${secondsLeft}d…` : 'Ya, Reset Sekarang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
