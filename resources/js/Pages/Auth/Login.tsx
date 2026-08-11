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
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">Selamat Datang</h1>
        <p className="mt-1.5 text-sm text-content-muted">
          Masuk ke Panel Admin &amp; Kasir <span className="font-semibold text-navy-900">Skillage Mart</span>
        </p>
      </div>

      {status && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
          {status}
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-5">
        {/* Username Field */}
        <div className="space-y-2">
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
              placeholder="Masukkan username"
              value={data.username}
              onChange={(e) => setData('username', e.target.value)}
              className="pl-10 h-11 bg-surface border-border text-navy-900 placeholder:text-content-subtle focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20 rounded-xl transition-all"
            />
          </div>
          {errors.username && (
            <div className="flex items-center gap-1.5 text-xs text-danger mt-1">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{errors.username}</span>
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

        {/* Options: Remember Me & Forgot Password */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5">
            <Checkbox
              id="remember"
              checked={data.remember}
              onCheckedChange={(checked) => setData('remember', checked === true)}
              className="border-border data-[state=checked]:bg-navy-900 data-[state=checked]:border-navy-900"
            />
            <Label htmlFor="remember" className="text-xs font-semibold text-content-muted cursor-pointer select-none">
              Ingat saya
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
          disabled={processing}
          className="mt-2 h-11 w-full bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {processing ? (
            <div className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <span>Masuk Ke Panel</span>
              <LogIn className="size-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  )
}

Login.layout = (page: ReactElement) => <GuestLayout>{page}</GuestLayout>
