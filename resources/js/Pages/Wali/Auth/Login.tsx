import { Link, useForm } from '@inertiajs/react'
import { useState, type FormEventHandler, type ReactElement } from 'react'
import GuestLayout from '@/Layouts/GuestLayout'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Phone, Lock, Eye, EyeOff, LogIn, AlertCircle, HeartHandshake } from 'lucide-react'

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)

  const { data, setData, post, processing, errors } = useForm({
    phone: '',
    password: '',
  })

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    post(route('wali.login.store'))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <HeartHandshake className="size-3.5" />
          Portal Orang Tua / Wali
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">Portal Wali Santri</h1>
        <p className="mt-1.5 text-sm text-content-muted">
          Pantau saldo, transaksi &amp; belanja anak Anda secara real-time
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-5">
        {/* Phone Field */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-navy-800">
            Nomor HP / WhatsApp
          </Label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-navy-500">
              <Phone className="size-4" />
            </div>
            <Input
              id="phone"
              type="text"
              autoFocus
              autoComplete="tel"
              inputMode="tel"
              placeholder="08123456789"
              value={data.phone}
              onChange={(e) => setData('phone', e.target.value)}
              className="pl-10 h-11 bg-surface border-border text-navy-900 placeholder:text-content-subtle focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-xl transition-all"
            />
          </div>
          {errors.phone && (
            <div className="flex items-center gap-1.5 text-xs text-danger mt-1">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{errors.phone}</span>
            </div>
          )}
        </div>

        {/* Password Field with Eye Toggle */}
        <div className="space-y-2">
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
          {errors.password && (
            <div className="flex items-center gap-1.5 text-xs text-danger mt-1">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{errors.password}</span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={processing}
          className="mt-2 h-11 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {processing ? (
            <div className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <span>Masuk Portal Wali</span>
              <LogIn className="size-4" />
            </>
          )}
        </Button>

        <div className="text-center pt-2">
          <Link
            href={route('wali.forgot-password.phone')}
            className="text-xs font-bold text-navy-600 hover:text-emerald-700 transition-colors hover:underline"
          >
            Lupa password portal wali?
          </Link>
        </div>
      </form>
    </div>
  )
}

Login.layout = (page: ReactElement) => <GuestLayout>{page}</GuestLayout>
