import { useState, type FormEventHandler, type ReactElement } from 'react'
import { useForm, usePage, router } from '@inertiajs/react'
import {
  AlertCircle, AlertTriangle, Bell, Calendar, CheckCircle2, Eye, EyeOff, Info, KeyRound,
  Lock, LogOut, Save, ShieldAlert, ShieldCheck, Smartphone, User, Users, Wallet,
} from 'lucide-react'
import WaliLayout from '@/Layouts/WaliLayout'
import { PasswordStrengthMeter } from '@/Components/common/PasswordStrengthMeter'
import { LogoutConfirmDialog } from '@/Components/common/LogoutConfirmDialog'
import { Button } from '@/Components/ui/button'
import { Label } from '@/Components/ui/label'
import { Input } from '@/Components/ui/input'
import { Switch } from '@/Components/ui/switch'
import { MoneyInput } from '@/Components/common/MoneyInput'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Avatar, AvatarFallback } from '@/Components/ui/avatar'
import type { PageProps } from '@/Types'
import { cn } from '@/Lib/utils'

type SettingProps = {
  setting: {
    low_balance_alert: boolean
    low_balance_threshold: number
    weekly_summary: boolean
    transaction_alert: boolean
  }
}

export default function Edit({ setting }: SettingProps) {
  const { guardianAuth } = usePage<PageProps>().props
  const guardian = guardianAuth?.guardian

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)

  const profileForm = useForm({
    name: guardian?.name ?? '',
  })

  const { data, setData, put, processing } = useForm(setting)

  const passwordForm = useForm({
    current_password: '',
    password: '',
    password_confirmation: '',
  })

  const submitProfile: FormEventHandler = (e) => {
    e.preventDefault()
    profileForm.put(route('wali.settings.profile'), {
      preserveScroll: true,
    })
  }

  const submitNotificationSettings: FormEventHandler = (e) => {
    e.preventDefault()
    put(route('wali.settings.update'), {
      preserveScroll: true,
    })
  }

  const submitPassword: FormEventHandler = (e) => {
    e.preventDefault()
    passwordForm.put(route('wali.settings.password'), {
      preserveScroll: true,
      onSuccess: () => passwordForm.reset(),
    })
  }

  const guardianInitials = guardian?.name
    ? guardian.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'WS'

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      {/* User Profile Header Card */}
      <Card className="overflow-hidden border-slate-200/80 bg-gradient-to-r from-navy-900 via-navy-800 to-navy-950 text-white shadow-md">
        <CardContent className="flex flex-col gap-4 p-5 sm:p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border-2 border-amber-500/30 shadow-md">
              <AvatarFallback className="bg-amber-500 text-navy-950 font-black text-xl">
                {guardianInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-white">
                  {guardian?.name ?? 'Wali Santri'}
                </h1>
                <ShieldCheck className="size-4.5 text-amber-400 fill-amber-400/20" />
              </div>
              <p className="text-xs text-slate-300">
                No. WhatsApp: <span className="font-mono text-slate-200 font-semibold">{guardian?.phone ?? '-'}</span>
              </p>
              <div className="mt-1.5 inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                Akun Wali Resmi
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 1: Ubah Profil (Khusus Nama Saja) */}
      <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-400/20 dark:text-blue-400">
              <User className="size-4.5" />
            </div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
              Informasi &amp; Ubah Profil Wali
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <form onSubmit={submitProfile} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="guardian_name" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Nama Lengkap Wali <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 size-4 text-slate-400" />
                <Input
                  id="guardian_name"
                  type="text"
                  value={profileForm.data.name}
                  onChange={(e) => profileForm.setData('name', e.target.value)}
                  className="h-11 pl-10 rounded-xl font-medium"
                  placeholder="Masukkan nama lengkap Anda"
                  required
                />
              </div>
              {profileForm.errors.name && (
                <p className="text-xs text-red-600 font-semibold">{profileForm.errors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="guardian_phone" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Nomor WhatsApp Terdaftar
                </Label>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                  <Lock className="size-3" />
                  Terkunci (Keamanan)
                </span>
              </div>
              <div className="relative">
                <Smartphone className="absolute left-3.5 top-3.5 size-4 text-slate-400" />
                <Input
                  id="guardian_phone"
                  type="text"
                  value={guardian?.phone ?? ''}
                  disabled
                  className="h-11 pl-10 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 font-mono text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Nomor WhatsApp digunakan sebagai identitas login utama. Hubungi pihak sekolah jika ingin mengganti nomor.
              </p>
            </div>

            <Button
              type="submit"
              disabled={profileForm.processing || !profileForm.data.name.trim() || profileForm.data.name === guardian?.name}
              className="h-11 gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-white shadow-md shadow-blue-500/20 transition-all mt-1"
            >
              <Save className="size-4" />
              {profileForm.processing ? 'Menyimpan…' : 'Simpan Nama Profil'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Section 2: Pengaturan Notifikasi */}
      <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400">
              <Bell className="size-4.5" />
            </div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
              Pengaturan Notifikasi &amp; Alert
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <form onSubmit={submitNotificationSettings} className="flex flex-col gap-4">
            {/* Low Balance Alert Switch */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 sm:p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <Label htmlFor="low_balance_alert" className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white cursor-pointer block">
                      Notifikasi Saldo Rendah
                    </Label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Peringatan otomatis saat saldo anak berada di bawah ambang batas.
                    </p>
                  </div>
                </div>
                <Switch
                  id="low_balance_alert"
                  checked={data.low_balance_alert}
                  onCheckedChange={(v) => setData('low_balance_alert', v)}
                />
              </div>

              {data.low_balance_alert && (
                <div className="mt-2 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Ambang Batas Saldo Rendah (Rp)
                  </Label>
                  <MoneyInput
                    value={data.low_balance_threshold}
                    onChange={(v) => setData('low_balance_threshold', v)}
                    className="h-11 rounded-xl text-sm font-bold"
                  />
                  <p className="text-[11px] text-slate-400">
                    Sistem akan mengirim notifikasi saat saldo anak kurang dari batas ini.
                  </p>
                </div>
              )}
            </div>

            {/* Weekly Summary Switch */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 sm:p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  <Calendar className="size-4" />
                </div>
                <div className="min-w-0">
                  <Label htmlFor="weekly_summary" className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white cursor-pointer block">
                    Ringkasan Belanja Mingguan
                  </Label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Laporan rekapitulasi total konsumsi anak setiap minggu.
                  </p>
                </div>
              </div>
              <Switch
                id="weekly_summary"
                checked={data.weekly_summary}
                onCheckedChange={(v) => setData('weekly_summary', v)}
              />
            </div>

            {/* Realtime Transaction Alert Switch */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 sm:p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                  <Smartphone className="size-4" />
                </div>
                <div className="min-w-0">
                  <Label htmlFor="transaction_alert" className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white cursor-pointer block">
                    Notifikasi Tiap Transaksi Realtime
                  </Label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Pemberitahuan instan begitu anak bertransaksi di kasir S-Mart.
                  </p>
                </div>
              </div>
              <Switch
                id="transaction_alert"
                checked={data.transaction_alert}
                onCheckedChange={(v) => setData('transaction_alert', v)}
              />
            </div>

            <Button
              type="submit"
              disabled={processing}
              className="h-11 gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 font-extrabold text-sm text-white shadow-md shadow-blue-500/25 transition-all mt-1 cursor-pointer"
            >
              <Save className="size-4" />
              {processing ? 'Menyimpan…' : 'Simpan Pengaturan Notifikasi'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Section 3: Ganti Password */}
      <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-400">
              <Lock className="size-4.5" />
            </div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
              Keamanan &amp; Ganti Password
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <form onSubmit={submitPassword} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="current_password" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Password Saat Ini
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 size-4 text-slate-400" />
                <Input
                  id="current_password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={passwordForm.data.current_password}
                  onChange={(e) => passwordForm.setData('current_password', e.target.value)}
                  className="h-11 pl-10 pr-10 rounded-xl"
                  placeholder="Masukkan password lama"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                  title={showCurrentPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {passwordForm.errors.current_password && (
                <p className="text-xs text-red-600 font-semibold">{passwordForm.errors.current_password}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new_password" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Password Baru
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 size-4 text-slate-400" />
                <Input
                  id="new_password"
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={passwordForm.data.password}
                  onChange={(e) => passwordForm.setData('password', e.target.value)}
                  className="h-11 pl-10 pr-10 rounded-xl"
                  placeholder="Minimal 6 karakter (huruf, angka, simbol)"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                  title={showNewPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <PasswordStrengthMeter password={passwordForm.data.password} />
              {passwordForm.errors.password && (
                <p className="text-xs text-red-600 font-semibold">{passwordForm.errors.password}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new_password_confirmation" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Konfirmasi Password Baru
              </Label>
              <div className="relative">
                <CheckCircle2 className="absolute left-3.5 top-3.5 size-4 text-slate-400" />
                <Input
                  id="new_password_confirmation"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={passwordForm.data.password_confirmation}
                  onChange={(e) => passwordForm.setData('password_confirmation', e.target.value)}
                  className="h-11 pl-10 pr-10 rounded-xl"
                  placeholder="Ketik ulang password baru"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                  title={showConfirmPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
              <ShieldAlert className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span>
                Demi keamanan akun, memperbarui password akan otomatis mengakhiri sesi login akun ini di perangkat lain.
              </span>
            </div>

            <Button
              type="submit"
              disabled={passwordForm.processing}
              className="h-11 gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 font-extrabold text-sm text-white shadow-md shadow-blue-500/25 transition-all mt-1 cursor-pointer"
            >
              <KeyRound className="size-4" />
              {passwordForm.processing ? 'Updating…' : 'Perbarui Password Akun'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Section 4: Logout Action */}
      <Card className="border-red-200/80 bg-red-50/50 shadow-xs dark:border-red-950/50 dark:bg-red-950/20">
        <CardContent className="flex flex-col gap-3 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-600 dark:text-red-400">
              <LogOut className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Keluar dari Akun Wali</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Akhiri sesi penggunaan portal wali santri di perangkat ini.</p>
            </div>
          </div>
          <Button
            variant="destructive"
            onClick={() => setLogoutOpen(true)}
            className="w-full sm:w-auto gap-2 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 shadow-sm"
          >
            <LogOut className="size-4" />
            Keluar Sekarang
          </Button>
        </CardContent>
      </Card>

      <LogoutConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        logoutUrl={route('wali.logout')}
        title="Konfirmasi Keluar Portal Wali"
        description="Apakah Ayah/Bunda yakin ingin keluar dari portal wali santri? Anda dapat masuk kembali kapan saja."
      />
    </div>
  )
}

Edit.layout = (page: ReactElement) => <WaliLayout active="akun">{page}</WaliLayout>
