import { useState, type ReactElement } from 'react'
import type { DateRange } from 'react-day-picker'
import type { ColumnDef } from '@tanstack/react-table'
import { Package, ShoppingCart, TrendingUp, Users } from 'lucide-react'

import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { StatCard } from '@/Components/common/StatCard'
import { EmptyState } from '@/Components/common/EmptyState'
import { Money } from '@/Components/common/Money'
import { MoneyInput } from '@/Components/common/MoneyInput'
import { DataTable } from '@/Components/common/DataTable'
import { DateRangePicker } from '@/Components/common/DateRangePicker'
import { PinInput } from '@/Components/common/PinInput'
import { ConfirmDialog } from '@/Components/common/ConfirmDialog'
import { LoadingOverlay } from '@/Components/common/LoadingOverlay'

import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Badge } from '@/Components/ui/badge'
import { Checkbox } from '@/Components/ui/checkbox'
import { Switch } from '@/Components/ui/switch'
import { Textarea } from '@/Components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/Components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/Components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/Components/ui/accordion'
import { useThemeStore } from '@/Store/useThemeStore'

type DummyRow = {
  id: string
  name: string
  category: string
  price: number
  stock: number
}

const categories = ['Makanan', 'Minuman', 'ATK', 'Kebersihan'] as const

const dummyRows: DummyRow[] = Array.from({ length: 20 }, (_, i) => ({
  id: `SKU-${1000 + i}`,
  name: `Produk Contoh ${i + 1}`,
  category: categories[i % categories.length] ?? categories[0],
  price: 5000 + i * 1250,
  stock: 50 - i * 2,
}))

const columns: ColumnDef<DummyRow, unknown>[] = [
  { accessorKey: 'id', header: 'SKU' },
  { accessorKey: 'name', header: 'Nama Produk' },
  { accessorKey: 'category', header: 'Kategori' },
  {
    accessorKey: 'price',
    header: 'Harga',
    cell: ({ row }) => <Money amount={row.original.price} />,
  },
  { accessorKey: 'stock', header: 'Stok' },
]

export default function UjiKomponen() {
  const { theme, toggleTheme } = useThemeStore()
  const [moneyValue, setMoneyValue] = useState(0)
  const [pin, setPin] = useState('')
  const [page, setPage] = useState(1)
  const [range, setRange] = useState<DateRange | undefined>()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Uji Komponen"
        subtitle="Halaman verifikasi visual — jangan dihapus, dipakai terus selama pengembangan."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Uji Komponen' }]}
        actions={
          <Button variant="outline" onClick={toggleTheme}>
            Mode Gelap: {theme}
          </Button>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Penjualan Hari Ini" value="Rp 4.250.000" icon={ShoppingCart} trend={12.5} trendLabel="vs kemarin" />
        <StatCard label="Transaksi" value="128" icon={TrendingUp} trend={-3.2} trendLabel="vs kemarin" />
        <StatCard label="Produk Aktif" value="342" icon={Package} />
        <StatCard label="Anggota" value="1.204" icon={Users} trend={4.1} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Button</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Badge</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge className="bg-success text-white">Success</Badge>
            <Badge className="bg-warning text-white">Warning</Badge>
            <Badge className="bg-teal text-white">Teal</Badge>
            <Badge className="bg-gold text-navy-900">Gold</Badge>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Form</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="input-demo">Input</Label>
              <Input id="input-demo" placeholder="Nama produk" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="money-demo">MoneyInput</Label>
              <MoneyInput value={moneyValue} onChange={setMoneyValue} />
            </div>
            <div className="space-y-1.5">
              <Label>Select</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="makanan">Makanan</SelectItem>
                  <SelectItem value="minuman">Minuman</SelectItem>
                  <SelectItem value="atk">ATK</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="textarea-demo">Textarea</Label>
              <Textarea id="textarea-demo" placeholder="Catatan" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="checkbox-demo" />
              <Label htmlFor="checkbox-demo">Checkbox</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="switch-demo" />
              <Label htmlFor="switch-demo">Switch</Label>
            </div>
            <div className="space-y-1.5">
              <Label>DateRangePicker</Label>
              <DateRangePicker value={range} onChange={setRange} />
            </div>
            <div className="space-y-1.5">
              <Label>PinInput</Label>
              <PinInput value={pin} onChange={setPin} onComplete={(v) => console.log('PIN lengkap:', v)} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dialog & Sheet</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Buka Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Contoh Dialog</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-content-muted">Ini adalah isi dialog contoh.</p>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Buka Sheet</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Contoh Sheet</SheetTitle>
                </SheetHeader>
              </SheetContent>
            </Sheet>

            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              Buka ConfirmDialog
            </Button>
            <ConfirmDialog
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              title="Hapus data ini?"
              description="Tindakan ini tidak bisa dibatalkan."
              variant="destructive"
              onConfirm={() => setConfirmOpen(false)}
            />

            <Button
              variant="outline"
              onClick={() => {
                setLoading(true)
                setTimeout(() => setLoading(false), 1500)
              }}
            >
              Tampilkan LoadingOverlay
            </Button>
            <LoadingOverlay show={loading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tabs & Accordion</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="tab1">
              <TabsList>
                <TabsTrigger value="tab1">Tab Satu</TabsTrigger>
                <TabsTrigger value="tab2">Tab Dua</TabsTrigger>
              </TabsList>
              <TabsContent value="tab1">Isi tab satu.</TabsContent>
              <TabsContent value="tab2">Isi tab dua.</TabsContent>
            </Tabs>

            <Accordion type="single" collapsible className="mt-4">
              <AccordionItem value="item-1">
                <AccordionTrigger>Pertanyaan pertama</AccordionTrigger>
                <AccordionContent>Jawaban pertama.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Pertanyaan kedua</AccordionTrigger>
                <AccordionContent>Jawaban kedua.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Money</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Money amount={12500} />
            <Money amount={1250000} size="lg" />
            <Money amount={50000} showSign />
            <Money amount={-25000} showSign />
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>EmptyState</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState title="Belum ada transaksi" description="Transaksi akan muncul di sini setelah kasir mulai berjualan." />
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>DataTable</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={dummyRows}
              enableRowSelection
              getRowId={(row) => row.id}
              bulkActions={[{ label: 'Hapus', variant: 'destructive', onClick: () => {} }]}
              pagination={{ page, perPage: 20, total: 20, onPageChange: setPage }}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

UjiKomponen.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
