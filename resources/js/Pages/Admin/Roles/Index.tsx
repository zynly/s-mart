import { useMemo, useState, type ReactElement } from 'react'
import { router } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { Card, CardContent } from '@/Components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs'
import { Checkbox } from '@/Components/ui/checkbox'
import { Button } from '@/Components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table'

type RoleRow = {
  id: number
  name: string
  permissions: string[]
}

type RolesIndexProps = {
  roles: RoleRow[]
  modules: string[]
  actions: string[]
  allPermissions: string[]
}

export default function Index({ roles, modules, actions, allPermissions }: RolesIndexProps) {
  const [activeRoleName, setActiveRoleName] = useState(roles[0]?.name ?? '')
  const activeRole = roles.find((r) => r.name === activeRoleName) ?? roles[0]
  const [selected, setSelected] = useState<Set<string>>(new Set(activeRole?.permissions ?? []))
  const [saving, setSaving] = useState(false)

  const specialPermissions = useMemo(
    () => allPermissions.filter((name) => !actions.some((action) => name.endsWith(`.${action}`))),
    [allPermissions, actions],
  )

  function switchRole(name: string) {
    setActiveRoleName(name)
    const role = roles.find((r) => r.name === name)
    setSelected(new Set(role?.permissions ?? []))
  }

  function toggle(permission: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(permission)
      else next.delete(permission)
      return next
    })
  }

  function toggleRow(module: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const action of actions) {
        const name = `${module}.${action}`
        if (allPermissions.includes(name)) {
          if (checked) next.add(name)
          else next.delete(name)
        }
      }
      return next
    })
  }

  function save() {
    if (!activeRole) return
    setSaving(true)
    router.put(
      route('admin.roles.update', activeRole.id),
      { permissions: Array.from(selected) },
      { preserveScroll: true, onFinish: () => setSaving(false) },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Role & Izin"
        subtitle="Matriks kewenangan tiap role — modul × aksi"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Role & Izin' }]}
        actions={
          <Button onClick={save} disabled={saving || !activeRole}>
            Simpan Perubahan
          </Button>
        }
      />

      <Tabs value={activeRoleName} onValueChange={switchRole}>
        <TabsList>
          {roles.map((role) => (
            <TabsTrigger key={role.id} value={role.name}>
              {role.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader className="sticky top-0 bg-surface">
              <TableRow>
                <TableHead>Modul</TableHead>
                {actions.map((action) => (
                  <TableHead key={action} className="text-center capitalize">
                    {action}
                  </TableHead>
                ))}
                <TableHead className="text-center">Semua</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map((module) => {
                const rowPermissions = actions
                  .map((action) => `${module}.${action}`)
                  .filter((name) => allPermissions.includes(name))
                const allChecked = rowPermissions.length > 0 && rowPermissions.every((name) => selected.has(name))

                return (
                  <TableRow key={module}>
                    <TableCell className="font-medium">{module}</TableCell>
                    {actions.map((action) => {
                      const name = `${module}.${action}`
                      const exists = allPermissions.includes(name)

                      return (
                        <TableCell key={action} className="text-center">
                          {exists ? (
                            <Checkbox
                              checked={selected.has(name)}
                              onCheckedChange={(checked) => toggle(name, checked === true)}
                            />
                          ) : (
                            <span className="text-content-muted">—</span>
                          )}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-center">
                      <Checkbox checked={allChecked} onCheckedChange={(checked) => toggleRow(module, checked === true)} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-2 p-4">
          <p className="text-sm font-medium text-content">Izin Khusus</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {specialPermissions.map((permission) => (
              <label key={permission} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selected.has(permission)}
                  onCheckedChange={(checked) => toggle(permission, checked === true)}
                />
                {permission}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
