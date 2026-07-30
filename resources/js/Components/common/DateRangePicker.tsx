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
    { label: '7 Hari', range: { from: subDays(today, 6), to: today } },
    { label: 'Minggu Ini', range: { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) } },
    { label: 'Bulan Ini', range: { from: startOfMonth(today), to: endOfMonth(today) } },
    { label: 'Bulan Lalu', range: { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) } },
  ]
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const presets = buildPresets()

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
      <PopoverContent className="flex w-auto gap-3 p-3" align="start">
        <div className="flex flex-col gap-1 border-r border-border pr-3">
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
          <Button variant="ghost" size="sm" className="justify-start">
            Kustom
          </Button>
        </div>
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          numberOfMonths={2}
          defaultMonth={value?.from}
        />
      </PopoverContent>
    </Popover>
  )
}
