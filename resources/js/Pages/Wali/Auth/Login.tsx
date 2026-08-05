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
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
          <HeartHandshake className="h-3.5 w-3.5" />
          Portal Orang Tua / Wali
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Portal Wali Santri</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Pantau saldo, transaksi &amp; belanja anak Anda secara real-time
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-5">
        {/* Phone Field */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Nomor HP / WhatsApp
          </Label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Phone className="h-4 w-4" />
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
              className="pl-10 h-11 bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all"
            />
          </div>
          {errors.phone && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errors.phone}</span>
            </div>
          )}
        </div>

        {/* Password Field with Eye Toggle */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Password
          </Label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={data.password}
              onChange={(e) => setData('password', e.target.value)}
              className="pl-10 pr-10 h-11 bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
              title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-emerald-400" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errors.password}</span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={processing}
          className="mt-2 h-11 w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/25 transition-all duration-200 hover:shadow-emerald-600/35 active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {processing ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <span>Masuk Portal Wali</span>
              <LogIn className="h-4 w-4" />
            </>
          )}
        </Button>

        <div className="text-center pt-2">
          <Link
            href={route('wali.forgot-password.phone')}
            className="text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors hover:underline"
          >
            Lupa password portal wali?
          </Link>
        </div>
      </form>
    </div>
  )
}

Login.layout = (page: ReactElement) => <GuestLayout>{page}</GuestLayout>
