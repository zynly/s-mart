import { useForm } from '@inertiajs/react'
import type { FormEventHandler, ReactElement } from 'react'
import GuestLayout from '@/Layouts/GuestLayout'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'

type ResetPasswordProps = {
  email: string
  token: string
}

export default function ResetPassword({ email, token }: ResetPasswordProps) {
  const { data, setData, post, processing, errors } = useForm({
    token,
    email,
    password: '',
    password_confirmation: '',
  })

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    post(route('password.update'))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-content">Atur Ulang Password</h1>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
          {errors.email && <p className="text-sm text-danger">{errors.email}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password Baru</Label>
          <Input
            id="password"
            type="password"
            autoFocus
            value={data.password}
            onChange={(e) => setData('password', e.target.value)}
          />
          {errors.password && <p className="text-sm text-danger">{errors.password}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password_confirmation">Konfirmasi Password</Label>
          <Input
            id="password_confirmation"
            type="password"
            value={data.password_confirmation}
            onChange={(e) => setData('password_confirmation', e.target.value)}
          />
          {errors.password_confirmation && <p className="text-sm text-danger">{errors.password_confirmation}</p>}
        </div>

        <Button type="submit" disabled={processing} className="w-full">
          Simpan Password Baru
        </Button>
      </form>
    </div>
  )
}

ResetPassword.layout = (page: ReactElement) => <GuestLayout>{page}</GuestLayout>
