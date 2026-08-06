import type { ReactElement, ReactNode } from 'react'
import { router, usePage } from '@inertiajs/react'
import { Check } from 'lucide-react'
import PosLayout from '@/Layouts/PosLayout'
import { Money } from '@/Components/common/Money'
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
      <div className="flex size-16 items-center justify-center rounded-full bg-green-100 text-green-600">
        <Check className="size-8" strokeWidth={2.5} />
      </div>
      <p className="text-lg font-semibold text-gray-900">Transaksi Berhasil</p>
      <p className="font-mono text-gray-500">{sale.reference}</p>

      <div className="w-full rounded-xl border border-gray-200 bg-white p-4">
        {sale.items.map((item) => (
          <div key={item.id} className="flex justify-between py-1 text-sm text-gray-700">
            <span>{item.product.name} × {item.qty}</span>
            <Money amount={item.subtotal} size="sm" />
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900">
          <span>TOTAL</span>
          <Money amount={sale.grand_total} size="lg" />
        </div>
        {sale.payments.map((payment) => (
          <div key={payment.id} className="flex justify-between text-sm text-gray-500">
            <span>Bayar ({payment.payment_method.name})</span>
            <Money amount={payment.amount} size="sm" />
          </div>
        ))}
        {sale.change_amount > 0 && (
          <div className="flex justify-between text-sm text-gray-500">
            <span>Kembalian</span>
            <Money amount={sale.change_amount} size="sm" />
          </div>
        )}
        {sale.member && sale.payments.some((p) => p.payment_method.type === 'deposit') && (
          <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-sm text-gray-700">
            <span>Saldo Akhir {sale.member.name}</span>
            <Money amount={sale.member.balance_cache} />
          </div>
        )}
      </div>

      <div className="flex w-full gap-2">
        <button
          type="button"
          onClick={() => window.open(route('pos.sales.receipt-pdf', sale.id), '_blank')}
          className="flex-1 rounded-xl border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Cetak Struk
        </button>
        <button
          type="button"
          onClick={() => router.visit(route('pos.index'))}
          className="flex-1 rounded-xl bg-navy-700 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-800"
        >
          Transaksi Baru
        </button>
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
