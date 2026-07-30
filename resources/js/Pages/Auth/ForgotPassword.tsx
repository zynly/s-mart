import { useForm } from '@inertiajs/react'
import type { FormEventHandler, ReactElement } from 'react'
import GuestLayout from '@/Layouts/GuestLayout'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'

export default function ForgotPassword({ status }: { status?: string }) {
  const { data, setData, post, processing, errors } = useForm({ email: '' })

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    post(route('password.email'))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-content">Lupa Password</h1>
        <p className="text-sm text-content-muted">
          Masukkan email yang terdaftar di admin. Tautan reset akan dikirim ke email tersebut.
        </p>
      </div>

      {status && <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{status}</p>}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoFocus
            value={data.email}
            onChange={(e) => setData('email', e.target.value)}
          />
          {errors.email && <p className="text-sm text-danger">{errors.email}</p>}
        </div>

        <Button type="submit" disabled={processing} className="w-full">
          Kirim Tautan Reset
        </Button>
      </form>
    </div>
  )
}

ForgotPassword.layout = (page: ReactElement) => <GuestLayout>{page}</GuestLayout>
