import { cn } from '@/Lib/utils'

type Category = { id: number; name: string }

type CategoryChipsProps = {
  categories: Category[]
  active?: number | null
  onChange: (categoryId: number | null) => void
}

export function CategoryChips({ categories, active, onChange }: CategoryChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          'rounded-full border px-3 py-1.5 text-sm transition-colors',
          active == null ? 'border-navy-600 bg-navy-600 text-navy-50' : 'border-border bg-surface text-content-muted hover:text-content',
        )}
      >
        Semua
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onChange(category.id)}
          className={cn(
            'rounded-full border px-3 py-1.5 text-sm transition-colors',
            active === category.id ? 'border-navy-600 bg-navy-600 text-navy-50' : 'border-border bg-surface text-content-muted hover:text-content',
          )}
        >
          {category.name}
        </button>
      ))}
    </div>
  )
}
