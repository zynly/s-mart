import { useForm } from '@inertiajs/react'
import type { FormEventHandler, ReactElement } from 'react'
import GuestLayout from '@/Layouts/GuestLayout'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'

export default function Login() {
  const { data, setData, post, processing, errors } = useForm({
    phone: '',
    password: '',
  })

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    post(route('wali.login.store'))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-content">Portal Wali</h1>
        <p className="text-sm text-content-muted">Pantau saldo &amp; belanja anak Anda</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Nomor HP</Label>
          <Input
            id="phone"
            autoFocus
            autoComplete="tel"
            inputMode="tel"
            value={data.phone}
            onChange={(e) => setData('phone', e.target.value)}
          />
          {errors.phone && <p className="text-sm text-danger">{errors.phone}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={data.password}
            onChange={(e) => setData('password', e.target.value)}
          />
          {errors.password && <p className="text-sm text-danger">{errors.password}</p>}
        </div>

        <Button type="submit" disabled={processing} className="w-full">
          Masuk
        </Button>
      </form>
    </div>
  )
}

Login.layout = (page: ReactElement) => <GuestLayout>{page}</GuestLayout>
