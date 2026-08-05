import { useForm, Link } from '@inertiajs/react'
import { useState, type FormEventHandler, type ReactElement } from 'react'
import GuestLayout from '@/Layouts/GuestLayout'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Checkbox } from '@/Components/ui/checkbox'
import { User, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'

export default function Login({ status }: { status?: string }) {
  const [showPassword, setShowPassword] = useState(false)

  const { data, setData, post, processing, errors } = useForm({
    username: '',
    password: '',
    remember: false as boolean,
  })

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    post(route('login.store'))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">Selamat Datang</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Masuk ke Panel Admin &amp; Kasir <span className="font-semibold text-indigo-400">Skillage Mart</span>
        </p>
      </div>

      {status && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          {status}
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-5">
        {/* Username Field */}
        <div className="space-y-2">
          <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Username
          </Label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <User className="h-4 w-4" />
            </div>
            <Input
              id="username"
              type="text"
              autoFocus
              autoComplete="username"
              placeholder="Masukkan username"
              value={data.username}
              onChange={(e) => setData('username', e.target.value)}
              className="pl-10 h-11 bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all"
            />
          </div>
          {errors.username && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errors.username}</span>
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
              className="pl-10 pr-10 h-11 bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
              title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-indigo-400" />
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

        {/* Options: Remember Me & Forgot Password */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5">
            <Checkbox
              id="remember"
              checked={data.remember}
              onCheckedChange={(checked) => setData('remember', checked === true)}
              className="border-slate-700 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
            />
            <Label htmlFor="remember" className="text-xs font-medium text-slate-400 cursor-pointer select-none">
              Ingat saya
            </Label>
          </div>
          <Link
            href={route('password.request')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors hover:underline"
          >
            Lupa password?
          </Link>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={processing}
          className="mt-2 h-11 w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all duration-200 hover:shadow-indigo-600/40 active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {processing ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <span>Masuk Ke Panel</span>
              <LogIn className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  )
}

Login.layout = (page: ReactElement) => <GuestLayout>{page}</GuestLayout>
