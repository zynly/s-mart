import { Link } from '@inertiajs/react'
import { Button } from '@/Components/ui/button'
import PublicLayout from '@/Layouts/PublicLayout'
import type { ReactElement } from 'react'

export default function Welcome() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="font-mono text-3xl font-semibold text-navy-700 dark:text-navy-100">Skillage Mart</p>
      <p className="max-w-md text-content-muted">
        Minimarket SMK Skill Village Islamic School — belanja mudah dengan saldo deposit santri.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/produk">Lihat Produk</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/wali/login">Portal Wali</Link>
        </Button>
      </div>
    </div>
  )
}

Welcome.layout = (page: ReactElement) => <PublicLayout>{page}</PublicLayout>
