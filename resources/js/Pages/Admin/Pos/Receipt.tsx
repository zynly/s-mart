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
    <div className="mx-auto flex h-full max-w-lg flex-col items-center gap-4 overflow-y-auto p-4 sm:p-6">
      <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
        <Check className="size-7" strokeWidth={2.5} />
      </div>
      <div className="text-center">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Transaksi Berhasil</h1>
        <p className="font-mono text-xs text-gray-500">{sale.reference}</p>
      </div>

      {/* Thermal Receipt Paper Card (Tampilan Presisi Struk Termal 58mm/80mm) */}
      <div className="w-[320px] max-w-full font-mono text-[11px] leading-tight text-black bg-white p-4 border border-dashed border-gray-300 shadow-md">
        {/* Header Toko */}
        <div className="text-center font-bold text-xs uppercase tracking-wider mb-0.5">SKILLAGE MART</div>
        <div className="text-center text-[10px] text-gray-600">SMK Skill Village Islamic School</div>
        <div className="text-center text-[10px] text-gray-600">Jonggol, Kab. Bogor</div>

        <div className="my-2 border-b border-dashed border-black" />

        {/* Info Transaksi */}
        <div className="flex justify-between">
          <span>No: {sale.reference}</span>
        </div>
        <div className="flex justify-between">
          <span>Kasir: {sale.user?.name ?? 'Kasir'}</span>
        </div>
        <div className="flex justify-between">
          <span>Tgl: {new Date(sale.sale_date).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
        </div>

        <div className="my-2 border-b border-dashed border-black" />

        {/* Items */}
        <div className="space-y-1.5">
          {sale.items.map((item) => (
            <div key={item.id}>
              <div className="font-bold line-clamp-1">{item.product?.name ?? 'Produk'}</div>
              <div className="flex justify-between text-[10px] pl-2">
                <span>{item.qty} × Rp {item.unit_price.toLocaleString('id-ID')}</span>
                <span className="font-bold">Rp {item.subtotal.toLocaleString('id-ID')}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="my-2 border-b border-dashed border-black" />

        {/* Ringkasan Total */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>Rp {sale.subtotal.toLocaleString('id-ID')}</span>
          </div>
          {sale.total_discount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Diskon</span>
              <span>-Rp {sale.total_discount.toLocaleString('id-ID')}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-xs pt-1 border-t border-black">
            <span>TOTAL</span>
            <span>Rp {sale.grand_total.toLocaleString('id-ID')}</span>
          </div>

          {sale.payments.map((payment) => (
            <div key={payment.id} className="flex justify-between text-[10px] pt-0.5">
              <span>Bayar ({payment.payment_method?.name ?? 'Tunai'})</span>
              <span>Rp {payment.amount.toLocaleString('id-ID')}</span>
            </div>
          ))}

          {sale.change_amount > 0 && (
            <div className="flex justify-between text-[10px] pt-0.5">
              <span>Kembali</span>
              <span>Rp {sale.change_amount.toLocaleString('id-ID')}</span>
            </div>
          )}
        </div>

        {/* Member & Saldo / Status Kredit */}
        {sale.member && (
          <>
            <div className="my-2 border-b border-dashed border-black" />
            <div className="text-[10px]">
              <span className="font-bold">{sale.member.name}</span>
              {sale.member.class_name && <span> ({sale.member.class_name})</span>}
            </div>
            {sale.payments.some((p) => p.payment_method?.type === 'deposit') && (
              <div className="flex justify-between font-bold text-[10px] pt-1">
                <span>Saldo Akhir</span>
                <span>Rp {sale.member.balance_cache.toLocaleString('id-ID')}</span>
              </div>
            )}
            {sale.payments.some((p) => p.payment_method?.type === 'credit') && (
              <div className="flex justify-between font-bold text-[10px] pt-1 text-amber-900">
                <span>Status Pembayaran</span>
                <span>KREDIT / TEMPO</span>
              </div>
            )}
          </>
        )}

        <div className="my-2 border-b border-dashed border-black" />
        <div className="text-center text-[10px] text-gray-700">Terima kasih & barakallah</div>
        <div className="text-center text-[9px] text-gray-500">Simpan struk sebagai bukti resmi</div>
      </div>

      {/* Tombol Aksi */}
      <div className="flex w-full max-w-[320px] gap-2 mt-1">
        <button
          type="button"
          onClick={() => window.open(route('pos.sales.receipt-pdf', sale.id), '_blank')}
          className="flex-1 rounded-xl bg-navy-900 dark:bg-amber-500 text-white dark:text-navy-950 py-2.5 text-xs font-bold shadow-sm hover:bg-navy-800 transition-colors"
        >
          Cetak Struk (PDF)
        </button>
        <button
          type="button"
          onClick={() => router.visit(route('pos.index'))}
          className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-surface py-2.5 text-xs font-bold text-gray-800 dark:text-gray-200 transition-colors hover:bg-gray-50"
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
