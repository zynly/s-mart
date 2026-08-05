import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import {
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/Components/ui/button'
import { Calendar } from '@/Components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover'
import { formatDate } from '@/Lib/date'
import { cn } from '@/Lib/utils'

type DateRangePickerProps = {
  value?: DateRange
  onChange: (range: DateRange | undefined) => void
  className?: string
}

function buildPresets(): { label: string; range: DateRange }[] {
  const today = new Date()

  return [
    { label: 'Hari Ini', range: { from: today, to: today } },
    { label: 'Kemarin', range: { from: subDays(today, 1), to: subDays(today, 1) } },
    { label: '7 Hari Terakhir', range: { from: subDays(today, 6), to: today } },
    { label: 'Minggu Ini', range: { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) } },
    { label: 'Bulan Ini', range: { from: startOfMonth(today), to: endOfMonth(today) } },
    { label: 'Bulan Lalu', range: { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) } },
  ]
}

/**
 * REVISI-R1-v2.md §3.6 — alur BERJENJANG: buka popover → HANYA daftar
 * preset (6 pilihan + "Kustom…") tampil dulu, bukan preset+2 kalender
 * sekaligus seperti sebelumnya (terlalu ramai, dan tombol "Kustom"
 * lama tidak punya onClick sama sekali — dead button). Kalender 2
 * bulan HANYA muncul setelah "Kustom…" diklik.
 */
export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'presets' | 'custom'>('presets')
  const presets = buildPresets()

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      // Selalu mulai dari daftar preset tiap kali popover dibuka —
      // tidak "mengingat" pernah di mode Kustom sebelumnya.
      setMode('presets')
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('justify-start text-left font-normal', className)}>
          <CalendarIcon className="size-4" />
          {value?.from ? (
            value.to ? (
              <>
                {formatDate(value.from)} – {formatDate(value.to)}
              </>
            ) : (
              formatDate(value.from)
            )
          ) : (
            <span className="text-content-muted">Pilih rentang tanggal</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        {mode === 'presets' ? (
          <div className="flex flex-col gap-1">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => {
                  onChange(preset.range)
                  setOpen(false)
                }}
              >
                {preset.label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" className="justify-start" onClick={() => setMode('custom')}>
              Kustom…
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button variant="ghost" size="sm" className="w-fit text-content-muted" onClick={() => setMode('presets')}>
              ← Kembali ke preset
            </Button>
            <Calendar
              mode="range"
              selected={value}
              onSelect={onChange}
              numberOfMonths={2}
              defaultMonth={value?.from}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
