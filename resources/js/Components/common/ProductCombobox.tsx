import { useState } from 'react'
import { ChevronsUpDown } from 'lucide-react'
import { Button } from '@/Components/ui/button'
import { Checkbox } from '@/Components/ui/checkbox'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/Components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover'
import { cn } from '@/Lib/utils'

export type ProductComboboxOption = { id: number; name: string; sku: string }

type ProductComboboxProps<T extends ProductComboboxOption> = {
  products: T[]
  value: string
  onSelect: (product: T) => void
  placeholder?: string
  className?: string
}

/**
 * Ganti dropdown native `<Select>` untuk memilih produk di form baris
 * item (Terima Barang, Buat PO) — daftar produk bisa ratusan/ribuan,
 * dropdown polos tidak bisa diketik/dicari. "Scan" = ketik cepat
 * SKU/barcode ke input ini, produk yang cocok langsung muncul di
 * atas (cmdk filter cocok ke `value` yang menggabungkan nama+SKU).
 * Generik atas `T` supaya `onSelect` mengembalikan objek produk ASLI
 * (mis. termasuk `base_unit_id`), bukan cuma bentuk minimal, sehingga
 * caller tidak perlu re-lookup ke array `products` lagi.
 */
export function ProductCombobox<T extends ProductComboboxOption>({ products, value, onSelect, placeholder = 'Pilih produk', className }: ProductComboboxProps<T>) {
  const [open, setOpen] = useState(false)
  const selected = products.find((p) => String(p.id) === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', !selected && 'text-muted-foreground', className)}
        >
          <span className="truncate">{selected ? `${selected.name} (${selected.sku})` : placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Ketik nama atau SKU produk…" />
          <CommandList>
            <CommandEmpty>Produk tidak ditemukan.</CommandEmpty>
            <CommandGroup>
              {products.map((p) => {
                const isSelected = String(p.id) === value
                return (
                  <CommandItem
                    key={p.id}
                    value={`${p.name} ${p.sku}`}
                    onSelect={() => {
                      onSelect(p)
                      setOpen(false)
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg cursor-pointer"
                  >
                    <Checkbox checked={isSelected} className="pointer-events-none shrink-0" />
                    <span className={cn('truncate', isSelected ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200')}>
                      {p.name} <span className="text-slate-400 font-normal">({p.sku})</span>
                    </span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
