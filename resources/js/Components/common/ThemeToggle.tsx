import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/Components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu'
import { useThemeStore } from '@/Store/useThemeStore'
import { cn } from '@/Lib/utils'

const OPTIONS = [
  { value: 'light' as const, label: 'Terang', icon: Sun },
  { value: 'dark' as const, label: 'Gelap', icon: Moon },
  { value: 'system' as const, label: 'Sistem', icon: Monitor },
]

type ThemeToggleProps = {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useThemeStore()
  const Active = OPTIONS.find((o) => o.value === theme)?.icon ?? Monitor

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className={cn(className)} aria-label="Ganti tema">
          <Active className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map((option) => (
          <DropdownMenuItem key={option.value} onClick={() => setTheme(option.value)} className={theme === option.value ? 'font-medium' : undefined}>
            <option.icon className="size-4" />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
