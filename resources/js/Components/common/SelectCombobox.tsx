import { useState } from 'react'
import { ChevronsUpDown } from 'lucide-react'
import { Button } from '@/Components/ui/button'
import { Checkbox } from '@/Components/ui/checkbox'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/Components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover'
import { cn } from '@/Lib/utils'

export type ComboboxOption = {
  value: string
  label: string
  description?: string
}

type SelectComboboxProps = {
  options: ComboboxOption[]
  value: string
  onSelect: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  triggerClassName?: string
  searchable?: boolean
}

/**
 * Sub-popup Combobox universal dengan pencarian dan checkbox indikator terpilih.
 * Mengganti dropdown native `<Select>` agar pengguna dapat mencari opsi dengan cepat
 * dan melihat status pilihan melalui checkbox sub-popup.
 */
export function SelectCombobox({
  options,
  value,
  onSelect,
  placeholder = 'Pilih opsional…',
  searchPlaceholder = 'Cari pilihan…',
  className,
  triggerClassName,
  searchable = true,
}: SelectComboboxProps) {
  const [open, setOpen] = useState(false)
  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal text-xs h-9 px-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60',
            !selectedOption && 'text-muted-foreground',
            triggerClassName
          )}
        >
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-50 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          'w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0 shadow-lg border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 z-50',
          className
        )}
        align="start"
      >
        <Command>
          {searchable && (
            <CommandInput
              placeholder={searchPlaceholder}
              className="text-xs h-9 border-b border-slate-100 dark:border-slate-800"
            />
          )}
          <CommandList className="max-h-60 p-1">
            <CommandEmpty className="py-3 text-center text-xs text-slate-500">Tidak ditemukan.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = option.value === value

                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onSelect(option.value)
                      setOpen(false)
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={isSelected}
                      className="pointer-events-none shrink-0"
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className={cn('truncate', isSelected ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200')}>
                        {option.label}
                      </span>
                      {option.description && (
                        <span className="text-[10px] text-slate-400 truncate">{option.description}</span>
                      )}
                    </div>
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
