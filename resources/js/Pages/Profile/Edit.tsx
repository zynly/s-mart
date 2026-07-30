import { useForm, usePage } from '@inertiajs/react'
import { useRef, type FormEventHandler, type ReactElement } from 'react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PinInput } from '@/Components/common/PinInput'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/Components/ui/avatar'
import type { PageProps } from '@/Types'

export default function Edit() {
  const { auth } = usePage<PageProps>().props
  const user = auth.user!
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    </div>
  )
}

Edit.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
