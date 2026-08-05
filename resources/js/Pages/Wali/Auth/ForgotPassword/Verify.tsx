import { useForm } from '@inertiajs/react'
import type { FormEventHandler, ReactElement } from 'react'
import GuestLayout from '@/Layouts/GuestLayout'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'

type VerifyProps = { token: string }

// REVISI-R1-v2.md §8.1 — HANYA menanyakan NIS/nama/tanggal lahir anak,
// TIDAK PERNAH menampilkan nama anak mana yang dipilih sistem (itu
// bocor) — wali harus tahu sendiri jawabannya.
export default function Verify({ token }: VerifyProps) {
  const { data, setData, post, processing, errors } = useForm({
    token,
    nis: '',
    full_name: '',
    birth_date: '',
  })

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    post(route('wali.forgot-password.verify.store'))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-content">Verifikasi Data Anak</h1>
        <p className="text-sm text-content-muted">Isi data salah satu anak Anda persis sesuai data sekolah.</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="nis">NIS Anak</Label>
          <Input id="nis" autoFocus value={data.nis} onChange={(e) => setData('nis', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Nama Lengkap Anak</Label>
          <Input id="full_name" value={data.full_name} onChange={(e) => setData('full_name', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="birth_date">Tanggal Lahir Anak</Label>
          <Input id="birth_date" type="date" value={data.birth_date} onChange={(e) => setData('birth_date', e.target.value)} />
        </div>

        {/* Pesan gagal SELALU ditampilkan lewat field `nis` (lihat
            ForgotPasswordController::submitVerify()) — dirender di sini
            secara umum, bukan diasosiasikan ke satu field spesifik di
            layar, supaya tidak terkesan "field ini yang salah". */}
        {(errors.nis || errors.full_name || errors.birth_date) && (
          <p className="text-sm text-danger">{errors.nis || errors.full_name || errors.birth_date}</p>
        )}

        <Button type="submit" disabled={processing} className="w-full">
          Verifikasi
        </Button>
      </form>
    </div>
  )
}

Verify.layout = (page: ReactElement) => <GuestLayout>{page}</GuestLayout>
