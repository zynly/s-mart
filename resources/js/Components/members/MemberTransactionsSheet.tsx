import { useState, useEffect } from 'react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/Components/ui/sheet'
import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import {
  ArrowDownLeft, ArrowUpRight, ShoppingBag, Wallet, RefreshCw, Calendar, User, FileText, CheckCircle2,
} from 'lucide-react'

type MemberBasic = {
  id: number
  name: string
  member_number: string
  nis?: string | null
  balance_cache: number
}

type DepositTransactionItem = {
  id: number
  reference: string
  type: 'topup' | 'purchase' | 'withdrawal' | 'refund' | 'adjustment' | 'bonus' | 'card_transfer_out' | 'card_transfer_in' | 'closing'
  amount: number
  balance_before: number
  balance_after: number
  note?: string | null
  created_at: string
  user?: { id: number; name: string } | null
  approver?: { id: number; name: string } | null
  payment_method?: { id: number; name: string } | null
  sourceable?: { id: number; invoice_number?: string; grand_total?: number } | null
}

type MemberTransactionsSheetProps = {
  member: MemberBasic | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MemberTransactionsSheet({ member, open, onOpenChange }: MemberTransactionsSheetProps) {
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState<string>('')
  const [data, setData] = useState<{
    member: MemberBasic
    transactions: {
      data: DepositTransactionItem[]
      current_page: number
      last_page: number
      total: number
    }
  } | null>(null)

  useEffect(() => {
    if (open && member) {
      fetchTransactions(member.id, filterType)
    } else {
      setData(null)
    }
  }, [open, member, filterType])

  function fetchTransactions(memberId: number, type: string) {
    setLoading(true)
    const url = route('admin.members.transactions', memberId) + (type ? `?type=${type}` : '')
    fetch(url, { headers: { Accept: 'application/json' } })
      .then(async (res) => {
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  if (!member) return null

  const displayMember = data?.member ?? member

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6">
        <SheetHeader className="pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet className="size-5 text-amber-500" />
                Riwayat Transaksi Anggota
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500 dark:text-slate-400">
                Log mutasi lengkap deposit, belanja POS, dan tarik tunai.
              </SheetDescription>
            </div>
          </div>

          {/* Member Card Banner */}
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">{displayMember.name}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                No: {displayMember.member_number} {displayMember.nis ? `• NIS: ${displayMember.nis}` : ''}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Saldo Deposit</span>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                Rp {displayMember.balance_cache.toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Filter Switcher */}
        <div className="my-4 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setFilterType('')}
            className={`flex-1 rounded-lg py-1.5 font-bold transition-all ${
              filterType === ''
                ? 'bg-white text-slate-900 shadow-sm dark:bg-amber-500 dark:text-navy-950'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setFilterType('topup')}
            className={`flex-1 rounded-lg py-1.5 font-bold transition-all ${
              filterType === 'topup'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-amber-500 dark:text-navy-950'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            Deposit / Topup
          </button>
          <button
            type="button"
            onClick={() => setFilterType('purchase')}
            className={`flex-1 rounded-lg py-1.5 font-bold transition-all ${
              filterType === 'purchase'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-amber-500 dark:text-navy-950'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            Pembelian POS
          </button>
          <button
            type="button"
            onClick={() => setFilterType('withdrawal')}
            className={`flex-1 rounded-lg py-1.5 font-bold transition-all ${
              filterType === 'withdrawal'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-amber-500 dark:text-navy-950'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            Tarik Tunai
          </button>
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="size-5 animate-spin text-amber-500" />
            Memuat riwayat transaksi...
          </div>
        ) : !data || data.transactions.data.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Belum ada data transaksi deposit.
          </div>
        ) : (
          <div className="space-y-3">
            {data.transactions.data.map((item) => {
              const isPositive = item.amount > 0
              const isPurchase = item.type === 'purchase'
              const isWithdrawal = item.type === 'withdrawal'
              const isTopup = item.type === 'topup'

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs transition-all dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex size-9 shrink-0 items-center justify-center rounded-xl font-bold ${
                          isPurchase
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : isWithdrawal
                            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {isPurchase ? (
                          <ShoppingBag className="size-4.5" />
                        ) : isWithdrawal ? (
                          <ArrowUpRight className="size-4.5" />
                        ) : (
                          <ArrowDownLeft className="size-4.5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                            {isTopup && 'Top-Up Deposit'}
                            {isPurchase && 'Belanja POS'}
                            {isWithdrawal && 'Tarik Tunai Deposit'}
                            {item.type === 'bonus' && 'Bonus Saldo'}
                            {item.type === 'refund' && 'Refund Retur'}
                            {item.type === 'adjustment' && 'Penyesuaian Saldo'}
                          </span>
                          <Badge
                            className={`text-[9px] px-1.5 py-0 font-bold ${
                              isPositive
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                : isWithdrawal
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                            }`}
                          >
                            {item.reference}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {new Date(item.created_at).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`font-black text-sm font-mono ${
                          isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {isPositive ? '+' : ''}Rp {item.amount.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  {/* Audit Trail: Balance Before & After */}
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-1.5 text-[11px] border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">
                      Saldo Awal: <strong className="text-slate-700 dark:text-slate-200">Rp {item.balance_before.toLocaleString('id-ID')}</strong>
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Saldo Akhir: <strong className="text-emerald-700 dark:text-emerald-400">Rp {item.balance_after.toLocaleString('id-ID')}</strong>
                    </span>
                  </div>

                  {/* Notes & User */}
                  {(item.note || item.user || item.sourceable?.invoice_number) && (
                    <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                      {item.sourceable?.invoice_number && (
                        <p className="font-semibold text-blue-600 dark:text-blue-400">
                          Faktur POS: #{item.sourceable.invoice_number}
                        </p>
                      )}
                      {item.note && <p className="italic">"{item.note}"</p>}
                      {item.user && <p className="text-[10px] text-slate-400">Operator: {item.user.name}</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
