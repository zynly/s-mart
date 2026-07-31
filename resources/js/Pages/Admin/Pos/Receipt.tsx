import type { ReactElement, ReactNode } from 'react'
import { router, usePage } from '@inertiajs/react'
import PosLayout from '@/Layouts/PosLayout'
import { Money } from '@/Components/common/Money'
import { Button } from '@/Components/ui/button'
import type { PageProps } from '@/Types'

type SaleDetail = {
  id: number
  reference: string
  sale_date: string
  subtotal: number
  total_discount: number
  grand_total: number
  paid_amount: number
  change_amount: number
  items: { id: number; product: { name: string }; qty: string; unit_price: number; subtotal: number }[]
  member: { name: string; class_name: string | null; balance_cache: number } | null
  payments: { id: number; amount: number; payment_method: { name: string; type: string } }[]
  user: { name: string };
}

export default function Receipt({ sale }: { sale: SaleDetail }) {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center gap-4 overflow-y-auto p-6">
      <div className="flex size-16 items-center justify-center rounded-full bg-success/10 text-success">
        <svg xmlns="http://www.w3.org/2000/svg" className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="text-lg font-semibold">Transaksi Berhasil</p>
      <p className="font-mono text-content-muted">{sale.reference}</p>

      <div className="w-full rounded-lg border border-border bg-surface p-4">
        {sale.items.map((item) => (
          <div key={item.id} className="flex justify-between py-1 text-sm">
            <span>{item.product.name} × {item.qty}</span>
            <Money amount={item.subtotal} size="sm" />
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
          <span>TOTAL</span>
          <Money amount={sale.grand_total} size="lg" />
        </div>
        {sale.payments.map((payment) => (
          <div key={payment.id} className="flex justify-between text-sm text-content-muted">
            <span>Bayar ({payment.payment_method.name})</span>
            <Money amount={payment.amount} size="sm" />
          </div>
        ))}
        {sale.change_amount > 0 && (
          <div className="flex justify-between text-sm text-content-muted">
            <span>Kembalian</span>
            <Money amount={sale.change_amount} size="sm" />
          </div>
        )}
        {sale.member && sale.payments.some((p) => p.payment_method.type === 'deposit') && (
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm">
            <span>Saldo Akhir {sale.member.name}</span>
            <Money amount={sale.member.balance_cache} />
          </div>
        )}
      </div>

      <div className="flex w-full gap-2">
        <Button variant="outline" className="flex-1" onClick={() => window.open(route('pos.sales.receipt-pdf', sale.id), '_blank')}>
          Cetak Struk
        </Button>
        <Button className="flex-1" onClick={() => router.visit(route('pos.index'))}>
          Transaksi Baru
        </Button>
      </div>
    </div>
  )
}

function ReceiptShell({ children }: { children: ReactNode }) {
  const { props } = usePage<PageProps>()

  return (
    <PosLayout cashierName={props.auth.user?.name ?? '-'} onCloseSession={() => router.visit(route('admin.cashier-session.index'))}>
      {children}
    </PosLayout>
  )
}

Receipt.layout = (page: ReactElement) => <ReceiptShell>{page}</ReceiptShell>
