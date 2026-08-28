import { useForm, Link } from '@inertiajs/react'
import { useState, type FormEventHandler, type ReactElement } from 'react'
import GuestLayout from '@/Layouts/GuestLayout'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Checkbox } from '@/Components/ui/checkbox'
import { User, Lock, Eye, EyeOff, LogIn, AlertCircle, ShieldCheck } from 'lucide-react'

type LoginProps = {
  status?: string
}

export default function Login({ status }: LoginProps) {
  const [showPassword, setShowPassword] = useState(false)

  const { data, setData, post, processing, errors } = useForm({
    identity: '',
    password: '',
    remember: false as boolean,
  })

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    post(route('login.post'))
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Title */}
      <div className="text-center">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-navy-950/5 border border-navy-900/10 px-3.5 py-1 text-xs font-semibold text-navy-900 shadow-2xs">
          <ShieldCheck className="size-3.5 text-mustard-500" />
          Pintu Login Terpadu Skillage Mart
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">Selamat Datang</h1>
        <p className="mt-1.5 text-xs sm:text-sm text-content-muted leading-relaxed">
          Masukkan kredensial Anda di bawah untuk masuk ke dashboard
        </p>
      </div>

      {status && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
          {status}
        </div>
      )}

      {/* Unified Single Login Form (Tanpa Tab) */}
      <form onSubmit={submit} className="flex flex-col gap-4">
        {/* Username / NIS / Phone Field */}
        <div className="space-y-1.5">
          <Label htmlFor="identity" className="text-xs font-bold uppercase tracking-wider text-navy-800">
            NIS Santri / Username / Nomor HP
          </Label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-navy-500">
              <User className="size-4" />
            </div>
            <Input
              id="identity"
              type="text"
              autoFocus
              autoComplete="username"
              placeholder="Masukkan NIS Santri, Username, atau No. HP"
              value={data.identity}
              onChange={(e) => setData('identity', e.target.value)}
              className="pl-10 h-11 bg-surface border-border text-navy-900 placeholder:text-content-subtle focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20 rounded-xl transition-all"
            />
          </div>
          {errors.identity && (
            <div className="flex items-center gap-1.5 text-xs text-danger mt-1">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{errors.identity}</span>
            </div>
          )}
        </div>

        {/* Password Field */}
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
              value={data.password}
              onChange={(e) => setData('password', e.target.value)}
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
          {errors.password && (
            <div className="flex items-center gap-1.5 text-xs text-danger mt-1">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{errors.password}</span>
            </div>
          )}
        </div>

        {/* Options: Remember Me & Forgot Password Links */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5">
            <Checkbox
              id="remember"
              checked={data.remember}
              onCheckedChange={(checked) => setData('remember', checked === true)}
              className="border-border data-[state=checked]:bg-navy-900 data-[state=checked]:border-navy-900"
            />
            <Label htmlFor="remember" className="text-xs font-semibold text-content-muted cursor-pointer select-none">
              Ingat sesi saya
            </Label>
          </div>
          <Link
            href={route('wali.forgot-password.phone')}
            className="text-xs font-bold text-navy-600 hover:text-navy-900 transition-colors hover:underline"
          >
            Lupa password Wali?
          </Link>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={processing}
          className="mt-2 h-11 w-full bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {processing ? (
            <div className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <span>Masuk Ke Dashboard</span>
              <LogIn className="size-4" />
            </>
          )}
        </Button>
      </form>

      {/* Dynamic Role Detection Notice */}
      <div className="rounded-xl border border-navy-100 bg-surface-alt/70 p-3 text-center">
        <p className="text-[11px] text-content-muted leading-relaxed">
          ✨ <span className="font-semibold text-navy-900">Sistem Deteksi Otomatis:</span> Gunakan Username untuk Staff/Admin/Kasir, atau Nomor HP terdaftar untuk Wali Santri. Dashboard akan disesuaikan otomatis setelah login.
        </p>
      </div>
    </div>
  )
}

Login.layout = (page: ReactElement) => <GuestLayout>{page}</GuestLayout>
