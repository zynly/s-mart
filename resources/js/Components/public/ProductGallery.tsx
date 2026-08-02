import { useState } from 'react'
import { Package } from 'lucide-react'
import { cn } from '@/Lib/utils'

type ProductGalleryProps = {
  images: string[]
  alt: string
}

export function ProductGallery({ images, alt }: ProductGalleryProps) {
  const [active, setActive] = useState(0)

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg border border-border bg-secondary text-content-muted">
        <Package className="size-16" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-square overflow-hidden rounded-lg border border-border bg-secondary">
        <img src={images[active]} alt={alt} className="size-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((img, i) => (
            <button
              key={img}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'size-16 shrink-0 overflow-hidden rounded-md border-2',
                active === i ? 'border-navy-600' : 'border-transparent',
              )}
            >
              <img src={img} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
