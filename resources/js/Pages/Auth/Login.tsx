import { useForm, Link } from '@inertiajs/react'
import { useState, type FormEventHandler, type ReactElement } from 'react'
import GuestLayout from '@/Layouts/GuestLayout'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Checkbox } from '@/Components/ui/checkbox'
import { User, Lock, Eye, EyeOff, LogIn, AlertCircle, ShieldCheck, HeartHandshake, Phone, Sparkles } from 'lucide-react'

type LoginProps = {
  status?: string
  defaultTab?: 'staff' | 'wali'
}

export default function Login({ status, defaultTab = 'staff' }: LoginProps) {
  const [activeTab, setActiveTab] = useState<'staff' | 'wali'>(defaultTab)
  const [showPassword, setShowPassword] = useState(false)

  // Staff Form
  const staffForm = useForm({
    username: '',
    password: '',
    remember: false as boolean,
  })

  // Wali Form
  const waliForm = useForm({
    phone: '',
    password: '',
    remember: false as boolean,
  })

  const submitStaff: FormEventHandler = (e) => {
    e.preventDefault()
    staffForm.post(route('login.store'))
  }

  const submitWali: FormEventHandler = (e) => {
    e.preventDefault()
    waliForm.post(route('wali.login.store'))
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Portal Header Title */}
      <div className="text-center">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-navy-950/5 border border-navy-900/10 px-3 py-1 text-xs font-bold text-navy-900 shadow-2xs">
          <Sparkles className="size-3.5 text-mustard-500" />
          Pintu Login Terpadu Skillage Mart
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">Selamat Datang</h1>
        <p className="mt-1 text-xs sm:text-sm text-content-muted">
          Silakan pilih jenis akun Anda di bawah untuk masuk ke dashboard
        </p>
      </div>

      {status && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
          {status}
        </div>
      )}

      {/* Role Tab Switcher */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-alt p-1 border border-border">
        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all ${
            activeTab === 'staff'
              ? 'bg-navy-900 text-white shadow-xs'
              : 'text-content-muted hover:text-content hover:bg-surface/50'
          }`}
        >
          <ShieldCheck className={`size-4 ${activeTab === 'staff' ? 'text-mustard-400' : ''}`} />
          <span>Staff / Admin / POS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('wali')}
          className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all ${
            activeTab === 'wali'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-content-muted hover:text-content hover:bg-surface/50'
          }`}
        >
          <HeartHandshake className={`size-4 ${activeTab === 'wali' ? 'text-emerald-200' : ''}`} />
          <span>Wali Santri</span>
        </button>
      </div>

      {/* TAB 1: STAFF / ADMIN / KASIR FORM */}
      {activeTab === 'staff' && (
        <form onSubmit={submitStaff} className="flex flex-col gap-4 animate-fade-in">
          {/* Username Field */}
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-navy-800">
              Username
            </Label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-navy-500">
                <User className="size-4" />
              </div>
              <Input
                id="username"
                type="text"
                autoFocus
                autoComplete="username"
                placeholder="Masukkan username staff"
                value={staffForm.data.username}
                onChange={(e) => staffForm.setData('username', e.target.value)}
                className="pl-10 h-11 bg-surface border-border text-navy-900 placeholder:text-content-subtle focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20 rounded-xl transition-all"
              />
            </div>
            {staffForm.errors.username && (
              <div className="flex items-center gap-1.5 text-xs text-danger mt-1">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{staffForm.errors.username}</span>
              </div>
            )}
          </div>

          {/* Password Field with Eye Toggle */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-navy-800">
              Password
            </Label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-navy-500">
                <Lock className="size-4" />
              </div>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={staffForm.data.password}
                onChange={(e) => staffForm.setData('password', e.target.value)}
                className="pl-10 pr-10 h-11 bg-surface border-border text-navy-900 placeholder:text-content-subtle focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20 rounded-xl transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-navy-500 hover:text-navy-800 transition-colors focus:outline-none"
                title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? (
                  <EyeOff className="size-4 text-navy-700" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {staffForm.errors.password && (
              <div className="flex items-center gap-1.5 text-xs text-danger mt-1">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{staffForm.errors.password}</span>
              </div>
            )}
          </div>

          {/* Options: Remember Me */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="remember_staff"
                checked={staffForm.data.remember}
                onCheckedChange={(checked) => staffForm.setData('remember', checked === true)}
                className="border-border data-[state=checked]:bg-navy-900 data-[state=checked]:border-navy-900"
              />
              <Label htmlFor="remember_staff" className="text-xs font-semibold text-content-muted cursor-pointer select-none">
                Ingat sesi saya
              </Label>
            </div>
            <Link
              href={route('password.request')}
              className="text-xs font-bold text-navy-600 hover:text-navy-900 transition-colors hover:underline"
            >
              Lupa password?
            </Link>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={staffForm.processing}
            className="mt-2 h-11 w-full bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {staffForm.processing ? (
              <div className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>Masuk Portal Staff / Admin</span>
                <LogIn className="size-4" />
              </>
            )}
          </Button>
        </form>
      )}

      {/* TAB 2: WALI SANTRI FORM */}
      {activeTab === 'wali' && (
        <form onSubmit={submitWali} className="flex flex-col gap-4 animate-fade-in">
          {/* Phone Field */}
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-navy-800">
              Nomor HP / WhatsApp
            </Label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-emerald-600">
                <Phone className="size-4" />
              </div>
              <Input
                id="phone"
                type="text"
                autoFocus
                autoComplete="tel"
                inputMode="tel"
                placeholder="08123456789"
                value={waliForm.data.phone}
                onChange={(e) => waliForm.setData('phone', e.target.value)}
                className="pl-10 h-11 bg-surface border-border text-navy-900 placeholder:text-content-subtle focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-xl transition-all"
              />
            </div>
            {waliForm.errors.phone && (
              <div className="flex items-center gap-1.5 text-xs text-danger mt-1">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{waliForm.errors.phone}</span>
              </div>
            )}
          </div>

          {/* Password Field with Eye Toggle */}
          <div className="space-y-1.5">
            <Label htmlFor="password_wali" className="text-xs font-bold uppercase tracking-wider text-navy-800">
              Password
            </Label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-emerald-600">
                <Lock className="size-4" />
              </div>
              <Input
                id="password_wali"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={waliForm.data.password}
                onChange={(e) => waliForm.setData('password', e.target.value)}
                className="pl-10 pr-10 h-11 bg-surface border-border text-navy-900 placeholder:text-content-subtle focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-xl transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-navy-500 hover:text-navy-800 transition-colors focus:outline-none"
                title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? (
                  <EyeOff className="size-4 text-emerald-600" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {waliForm.errors.password && (
              <div className="flex items-center gap-1.5 text-xs text-danger mt-1">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{waliForm.errors.password}</span>
              </div>
            )}
          </div>

          {/* Options: Remember Me & Forgot Password */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="remember_wali"
                checked={waliForm.data.remember}
                onCheckedChange={(checked) => waliForm.setData('remember', checked === true)}
                className="border-border data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
              />
              <Label htmlFor="remember_wali" className="text-xs font-semibold text-content-muted cursor-pointer select-none">
                Ingat sesi saya
              </Label>
            </div>
            <Link
              href={route('wali.forgot-password.phone')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 transition-colors hover:underline"
            >
              Lupa password?
            </Link>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={waliForm.processing}
            className="mt-2 h-11 w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {waliForm.processing ? (
              <div className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>Masuk Portal Wali Santri</span>
                <LogIn className="size-4" />
              </>
            )}
          </Button>
        </form>
      )}

      {/* Role Redirection Information Notice */}
      <div className="rounded-xl border border-navy-100 bg-surface-alt/70 p-3 text-center">
        <p className="text-[11px] text-content-muted leading-relaxed">
          💡 <span className="font-semibold text-navy-900">Petunjuk:</span> Setelah berhasil login, Anda akan otomatis diredirect ke dashboard sesuai hak akses/role kredensial akun Anda.
        </p>
      </div>
    </div>
  )
}

Login.layout = (page: ReactElement) => <GuestLayout>{page}</GuestLayout>
