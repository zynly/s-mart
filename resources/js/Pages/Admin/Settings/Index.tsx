import { type FormEventHandler } from 'react'
import { router, useForm } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/Components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/Components/ui/tabs'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Button } from '@/Components/ui/button'

type FieldMeta = { label: string; type: 'string' | 'integer' | 'decimal' | 'boolean'; description?: string }
type Section = {
  label: string
  fields: Record<string, FieldMeta>
  values: Record<string, string | number | boolean | null>
}

type SettingsIndexProps = {
  activeTab: string
  sections: Record<string, Section>
}

export default function Index({ activeTab, sections }: SettingsIndexProps) {
  const section = sections[activeTab] ?? { label: '', fields: {}, values: {} }
  const form = useForm<Record<string, string>>(
    Object.fromEntries(Object.entries(section.values).map(([k, v]) => [k, v === null || v === undefined ? '' : String(v)]))
  )

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    form.put(route('admin.settings.update', activeTab), { preserveScroll: true })
  }

  function switchTab(key: string) {
    router.get(route('admin.settings.index'), { section: key }, { preserveState: false })
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Pengaturan"
        subtitle="Parameter operasional toko — perubahan berlaku langsung untuk transaksi berikutnya"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Pengaturan' }]}
      />
      <PageTabs current="settings" tabs={[
        { key: 'settings', label: 'Pengaturan', href: route('admin.settings.index'), permission: 'setting.view' },
        { key: 'danger-zone', label: 'Danger Zone', href: route('admin.settings.danger-zone'), permission: 'system.reset' },
      ]}
      />

      <Tabs value={activeTab} onValueChange={switchTab}>
        <TabsList variant="line" className="w-full justify-start overflow-x-auto">
          {Object.entries(sections).map(([key, s]) => (
            <TabsTrigger key={key} value={key}>{s.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab}>
          <form onSubmit={submit}>
            <Card>
              <CardHeader>
                <CardTitle>{section.label}</CardTitle>
                <CardDescription>Simpan untuk menimpa nilai default sistem.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {Object.entries(section.fields).map(([key, meta]) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <Label htmlFor={key}>{meta.label}</Label>
                    <Input
                      id={key}
                      type={meta.type === 'integer' || meta.type === 'decimal' ? 'number' : 'text'}
                      step={meta.type === 'decimal' ? '0.01' : undefined}
                      value={form.data[key] ?? ''}
                      onChange={(e) => form.setData(key, e.target.value)}
                    />
                    {meta.description && <p className="text-xs text-content-muted">{meta.description}</p>}
                    {form.errors[key] && <p className="text-xs text-destructive">{form.errors[key]}</p>}
                  </div>
                ))}
              </CardContent>
              <CardFooter className="justify-end">
                <Button type="submit" disabled={form.processing}>Simpan</Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  )
}
