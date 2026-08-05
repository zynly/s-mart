import { useForm } from '@inertiajs/react'
import type { FormEventHandler, ReactElement } from 'react'
import WaliLayout from '@/Layouts/WaliLayout'
import { PasswordStrengthMeter } from '@/Components/common/PasswordStrengthMeter'
import { Button } from '@/Components/ui/button'
import { Label } from '@/Components/ui/label'
import { Input } from '@/Components/ui/input'
import { Switch } from '@/Components/ui/switch'
import { MoneyInput } from '@/Components/common/MoneyInput'
import { Card, CardContent } from '@/Components/ui/card'

type SettingProps = {
  setting: {
    low_balance_alert: boolean
    low_balance_threshold: number
    weekly_summary: boolean
    transaction_alert: boolean
  }
}

export default function Edit({ setting }: SettingProps) {
  const { data, setData, put, processing } = useForm(setting)

  const passwordForm = useForm({
    current_password: '',
    password: '',
    password_confirmation: '',
  })

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    put(route('wali.settings.update'))
  }

  const submitPassword: FormEventHandler = (e) => {
    e.preventDefault()
    passwordForm.put(route('wali.settings.password'), {
      preserveScroll: true,
      onSuccess: () => passwordForm.reset(),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-content">Pengaturan Notifikasi</h1>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="low_balance_alert" className="font-normal">Notifikasi Saldo Rendah</Label>
              <Switch id="low_balance_alert" checked={data.low_balance_alert} onCheckedChange={(v) => setData('low_balance_alert', v)} />
            </div>
            {data.low_balance_alert && (
              <div className="space-y-1.5">
                <Label>Ambang Batas Saldo</Label>
                <MoneyInput value={data.low_balance_threshold} onChange={(v) => setData('low_balance_threshold', v)} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <Label htmlFor="weekly_summary" className="font-normal">Ringkasan Belanja Mingguan</Label>
            <Switch id="weekly_summary" checked={data.weekly_summary} onCheckedChange={(v) => setData('weekly_summary', v)} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <Label htmlFor="transaction_alert" className="font-normal">Notifikasi Tiap Transaksi</Label>
            <Switch id="transaction_alert" checked={data.transaction_alert} onCheckedChange={(v) => setData('transaction_alert', v)} />
          </CardContent>
        </Card>

        <Button type="submit" disabled={processing} className="w-full">
          Simpan Pengaturan
        </Button>
      </form>

      <h1 className="mt-4 text-lg font-semibold text-content">Ganti Password</h1>
      <form onSubmit={submitPassword} className="flex flex-col gap-3">
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="space-y-1.5">
              <Label htmlFor="current_password">Password Saat Ini</Label>
              <Input
                id="current_password" type="password" autoComplete="current-password"
                value={passwordForm.data.current_password}
                onChange={(e) => passwordForm.setData('current_password', e.target.value)}
              />
              {passwordForm.errors.current_password && (
                <p className="text-sm text-danger">{passwordForm.errors.current_password}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new_password">Password Baru</Label>
              <Input
                id="new_password" type="password" autoComplete="new-password"
                value={passwordForm.data.password}
                onChange={(e) => passwordForm.setData('password', e.target.value)}
              />
              <PasswordStrengthMeter password={passwordForm.data.password} />
              {passwordForm.errors.password && <p className="text-sm text-danger">{passwordForm.errors.password}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new_password_confirmation">Konfirmasi Password Baru</Label>
              <Input
                id="new_password_confirmation" type="password" autoComplete="new-password"
                value={passwordForm.data.password_confirmation}
                onChange={(e) => passwordForm.setData('password_confirmation', e.target.value)}
              />
            </div>
            <p className="text-xs text-content-muted">
              Setelah diganti, perangkat lain yang sedang login dengan akun ini akan otomatis keluar.
            </p>
          </CardContent>
        </Card>
        <Button type="submit" disabled={passwordForm.processing} className="w-full">
          Ganti Password
        </Button>
      </form>
    </div>
  )
}

Edit.layout = (page: ReactElement) => <WaliLayout active="akun">{page}</WaliLayout>
