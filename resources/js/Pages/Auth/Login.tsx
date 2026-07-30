import { useForm, Link } from '@inertiajs/react'
import type { FormEventHandler, ReactElement } from 'react'
import GuestLayout from '@/Layouts/GuestLayout'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Checkbox } from '@/Components/ui/checkbox'

export default function Login({ status }: { status?: string }) {
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
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-content">Masuk</h1>
        <p className="text-sm text-content-muted">Panel admin &amp; kasir Skillage Mart</p>
      </div>

      {status && <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{status}</p>}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            autoFocus
            autoComplete="username"
            value={data.username}
            onChange={(e) => setData('username', e.target.value)}
          />
          {errors.username && <p className="text-sm text-danger">{errors.username}</p>}
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

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={data.remember}
              onCheckedChange={(checked) => setData('remember', checked === true)}
            />
            <Label htmlFor="remember" className="font-normal text-content-muted">
              Ingat saya
            </Label>
          </div>
          <Link href={route('password.request')} className="text-sm text-primary hover:underline">
            Lupa password?
          </Link>
        </div>

        <Button type="submit" disabled={processing} className="w-full">
          Masuk
        </Button>
      </form>
    </div>
  )
}

Login.layout = (page: ReactElement) => <GuestLayout>{page}</GuestLayout>
