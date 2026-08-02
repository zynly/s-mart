import type { ReactElement } from 'react'
import PublicLayout from '@/Layouts/PublicLayout'
import { PromoCard } from '@/Components/public/PromoCard'
import { EmptyState } from '@/Components/common/EmptyState'
import { Tag } from 'lucide-react'
import type { PublicPromo } from '@/Types/storefront'

type PromosProps = {
  active: PublicPromo[]
  upcoming: PublicPromo[]
}

export default function Promos({ active, upcoming }: PromosProps) {
  return (
    <div className="flex flex-col gap-10 py-4">
      <h1 className="text-2xl font-semibold text-content">Promo</h1>

      {active.length === 0 && upcoming.length === 0 ? (
        <EmptyState icon={Tag} title="Belum ada promo saat ini" description="Pantau terus halaman ini untuk penawaran terbaru." />
      ) : (
        <>
          {active.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-content">Sedang Berlangsung</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {active.map((promo) => <PromoCard key={promo.code} promo={promo} />)}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-content">Segera Hadir</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((promo) => <PromoCard key={promo.code} promo={promo} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

Promos.layout = (page: ReactElement) => <PublicLayout>{page}</PublicLayout>
