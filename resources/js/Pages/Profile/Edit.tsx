import { useForm, usePage } from '@inertiajs/react'
import { useRef, useState, type FormEventHandler, type ReactElement } from 'react'
import { toast } from 'sonner'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PinInput } from '@/Components/common/PinInput'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Badge } from '@/Components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/Components/ui/avatar'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { apiDelete, apiGet, apiPost, ApiError } from '@/Lib/api'
import type { PageProps } from '@/Types'

type EditProps = { twoFactorEnabled: boolean }

export default function Edit({ twoFactorEnabled: initialTwoFactorEnabled }: EditProps) {
  const { auth } = usePage<PageProps>().props
  const user = auth.user!
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(initialTwoFactorEnabled)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [manualSecret, setManualSecret] = useState<string | null>(null)
  const [setupCode, setSetupCode] = useState('')
  const [twoFactorBusy, setTwoFactorBusy] = useState(false)
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [recoveryDialogOpen, setRecoveryDialogOpen] = useState(false)

  async function enableTwoFactor() {
    setTwoFactorBusy(true)
    setTwoFactorError(null)

    try {
      await apiPost(route('two-factor.enable'))
      const [qr, secret] = await Promise.all([
        apiGet<{ svg: string }>(route('two-factor.qr-code')),
        apiGet<{ secretKey: string }>(route('two-factor.secret-key')),
      ])
      setQrCode(qr.svg)
      setManualSecret(secret.secretKey)
    } catch (e) {
      setTwoFactorError(e instanceof ApiError ? e.firstError() : 'Gagal mengaktifkan 2FA.')
    } finally {
      setTwoFactorBusy(false)
    }
  }

  async function confirmTwoFactor() {
    setTwoFactorBusy(true)
    setTwoFactorError(null)

    try {
      await apiPost(route('two-factor.confirm'), { code: setupCode })
      setQrCode(null)
      setManualSecret(null)
      setSetupCode('')
      setTwoFactorEnabled(true)
      toast.success('Autentikasi dua faktor aktif.')
    } catch (e) {
      setTwoFactorError(e instanceof ApiError ? e.firstError() : 'Kode tidak valid.')
    } finally {
      setTwoFactorBusy(false)
    }
  }

  async function disableTwoFactor() {
    setTwoFactorBusy(true)
    setTwoFactorError(null)

    try {
      await apiDelete(route('two-factor.disable'))
      setTwoFactorEnabled(false)
      setQrCode(null)
      setManualSecret(null)
      toast.success('Autentikasi dua faktor dinonaktifkan.')
    } catch (e) {
      setTwoFactorError(e instanceof ApiError ? e.firstError() : 'Gagal menonaktifkan 2FA.')
    } finally {
      setTwoFactorBusy(false)
    }
  }

  async function openRecoveryCodes() {
    setTwoFactorError(null)

    try {
      const codes = await apiGet<string[]>(route('two-factor.recovery-codes'))
      setRecoveryCodes(codes)
      setRecoveryDialogOpen(true)
    } catch (e) {
      setTwoFactorError(e instanceof ApiError ? e.firstError() : 'Gagal memuat kode pemulihan.')
    }
  }

  async function regenerateRecoveryCodes() {
    setTwoFactorError(null)

    try {
      await apiPost(route('two-factor.recovery-codes'))
      const codes = await apiGet<string[]>(route('two-factor.recovery-codes'))
      setRecoveryCodes(codes)
      toast.success('Kode pemulihan baru diterbitkan — kode lama tidak berlaku lagi.')
    } catch (e) {
      setTwoFactorError(e instanceof ApiError ? e.firstError() : 'Gagal menerbitkan ulang kode pemulihan.')
    }
  }

  const profileForm = useForm({
    name: user.name,
    email: user.email,
    phone: '',
    avatar: null as File | null,
  })

  const passwordForm = useForm({
    current_password: '',
    password: '',
    password_confirmation: '',
  })

  const pinForm = useForm({
    current_password: '',
    pin: '',
    pin_confirmation: '',
  })

  const submitProfile: FormEventHandler = (e) => {
    e.preventDefault()
    profileForm.post(route('profile.update'), {
      forceFormData: true,
      preserveScroll: true,
    })
  }

  const submitPassword: FormEventHandler = (e) => {
    e.preventDefault()
    passwordForm.put(route('user-password.update'), {
      preserveScroll: true,
      onSuccess: () => passwordForm.reset(),
    })
  }

  const submitPin: FormEventHandler = (e) => {
    e.preventDefault()
    pinForm.put(route('profile.pin.update'), {
      preserveScroll: true,
      onSuccess: () => pinForm.reset(),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Profil Saya"
        subtitle="Ubah informasi akun, password, dan PIN otorisasi"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Profil' }]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Informasi Profil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitProfile} className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarImage src={user.avatar ?? undefined} />
                <AvatarFallback className="text-lg">{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                Ganti Foto
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => profileForm.setData('avatar', e.target.files?.[0] ?? null)}
              />
            </div>
            {profileForm.errors.avatar && <p className="text-sm text-danger">{profileForm.errors.avatar}</p>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nama</Label>
                <Input
                  id="name"
                  value={profileForm.data.name}
                  onChange={(e) => profileForm.setData('name', e.target.value)}
                />
                {profileForm.errors.name && <p className="text-sm text-danger">{profileForm.errors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.data.email}
                  onChange={(e) => profileForm.setData('email', e.target.value)}
                />
                {profileForm.errors.email && <p className="text-sm text-danger">{profileForm.errors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">No. HP</Label>
                <Input
                  id="phone"
                  value={profileForm.data.phone}
                  onChange={(e) => profileForm.setData('phone', e.target.value)}
                />
                {profileForm.errors.phone && <p className="text-sm text-danger">{profileForm.errors.phone}</p>}
              </div>
            </div>

            <div>
              <Button type="submit" disabled={profileForm.processing}>
                Simpan Profil
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ubah Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitPassword} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="current_password">Password Saat Ini</Label>
              <Input
                id="current_password"
                type="password"
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
                id="new_password"
                type="password"
                value={passwordForm.data.password}
                onChange={(e) => passwordForm.setData('password', e.target.value)}
              />
              {passwordForm.errors.password && <p className="text-sm text-danger">{passwordForm.errors.password}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password_confirmation">Konfirmasi</Label>
              <Input
                id="password_confirmation"
                type="password"
                value={passwordForm.data.password_confirmation}
                onChange={(e) => passwordForm.setData('password_confirmation', e.target.value)}
              />
            </div>
            <div>
              <Button type="submit" disabled={passwordForm.processing}>
                Ubah Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PIN Otorisasi</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitPin} className="flex flex-col gap-4">
            <div className="max-w-xs space-y-1.5">
              <Label htmlFor="pin_current_password">Password Saat Ini</Label>
              <Input
                id="pin_current_password"
                type="password"
                value={pinForm.data.current_password}
                onChange={(e) => pinForm.setData('current_password', e.target.value)}
              />
              {pinForm.errors.current_password && (
                <p className="text-sm text-danger">{pinForm.errors.current_password}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>PIN Baru (6 digit)</Label>
              <PinInput length={6} value={pinForm.data.pin} onChange={(v) => pinForm.setData('pin', v)} />
              {pinForm.errors.pin && <p className="text-sm text-danger">{pinForm.errors.pin}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Konfirmasi PIN</Label>
              <PinInput
                length={6}
                value={pinForm.data.pin_confirmation}
                onChange={(v) => pinForm.setData('pin_confirmation', v)}
              />
            </div>
            <div>
              <Button type="submit" disabled={pinForm.processing}>
                Simpan PIN
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Autentikasi Dua Faktor
            {twoFactorEnabled && <Badge className="bg-success text-white">Aktif</Badge>}
          </CardTitle>
          <CardDescription>
            Lapisan keamanan tambahan lewat aplikasi autentikator (Google Authenticator, Authy, dst) saat login.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {twoFactorError && <p className="text-sm text-danger">{twoFactorError}</p>}

          {twoFactorEnabled ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={openRecoveryCodes}>
                Lihat Kode Pemulihan
              </Button>
              <Button type="button" variant="destructive" onClick={disableTwoFactor} disabled={twoFactorBusy}>
                Nonaktifkan 2FA
              </Button>
            </div>
          ) : qrCode ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-content-muted">
                Pindai kode QR ini dengan aplikasi autentikator Anda, lalu masukkan kode 6 digit yang muncul.
              </p>
              <div
                className="w-fit rounded-md border border-border bg-white p-3"
                dangerouslySetInnerHTML={{ __html: qrCode }}
              />
              {manualSecret && (
                <p className="text-xs text-content-muted">
                  Tidak bisa scan? Masukkan manual: <span className="font-mono">{manualSecret}</span>
                </p>
              )}
              <div className="max-w-xs space-y-1.5">
                <Label htmlFor="setup_code">Kode Konfirmasi</Label>
                <Input
                  id="setup_code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={confirmTwoFactor} disabled={twoFactorBusy || setupCode.length === 0}>
                  Konfirmasi &amp; Aktifkan
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setQrCode(null)
                    setManualSecret(null)
                    setSetupCode('')
                  }}
                >
                  Batal
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" onClick={enableTwoFactor} disabled={twoFactorBusy}>
              Aktifkan 2FA
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={recoveryDialogOpen} onOpenChange={setRecoveryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kode Pemulihan</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-content-muted">
            Simpan kode-kode ini di tempat aman. Tiap kode cuma bisa dipakai sekali sebagai pengganti kode
            autentikator kalau HP Anda hilang/tidak bisa diakses.
          </p>
          <div className="grid grid-cols-2 gap-2 rounded-md bg-bg p-3 font-mono text-sm">
            {recoveryCodes?.map((code) => <span key={code}>{code}</span>)}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={regenerateRecoveryCodes}>
              Terbitkan Ulang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Edit.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
