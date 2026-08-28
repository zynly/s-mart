import { useState, type ReactElement, type FormEvent } from 'react'
import { useForm } from '@inertiajs/react'
import { Wallet, Search, User, GraduationCap, Coins, CheckCircle2, RotateCcw, AlertCircle } from 'lucide-react'
import PublicLayout from '@/Layouts/PublicLayout'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Badge } from '@/Components/ui/badge'
import { Money } from '@/Components/common/Money'

type CheckBalanceProps = {
  result?: {
    name: string
    nis: string | null
    member_number: string
    class_name: string | null
    major: string | null
    type: string
    balance: number
    point_balance: number
  }
  error?: string
  submittedIdentity?: string
}

export default function CheckBalance({ result, error, submittedIdentity }: CheckBalanceProps) {
  const { data, setData, post, processing, reset } = useForm({ identity: submittedIdentity ?? '' })

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!data.identity.trim()) return
    post(route('cek-saldo.check'), {
      preserveScroll: true,
    })
  }

  function handleReset() {
    reset()
    setData('identity', '')
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-8 px-4 sm:px-0">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/50">
          <Wallet className="size-7 stroke-[2.2]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Cek Saldo Anggota
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Ketik <strong>NIS Santri</strong> atau <strong>Nama Lengkap</strong> (bisa huruf besar maupun kecil).
        </p>
      </div>

      {/* Form Input Pencarian */}
      <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-2">
          <Label htmlFor="identity" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            NIS Santri / Nama Anggota
          </Label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              id="identity"
              value={data.identity}
              onChange={(e) => setData('identity', e.target.value)}
              placeholder="Contoh: 202600001 atau Ahmad Fauzan Ridho"
              className="pl-10 h-11 text-sm bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
              autoFocus
            />
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Pencarian otomatis mengenali format nomor NIS maupun nama santri/staf.
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            type="submit"
            disabled={processing || !data.identity.trim()}
            className="flex-1 h-11 text-xs font-bold uppercase tracking-wider rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20"
          >
            {processing ? 'Mencari Data...' : 'Cek Saldo Sekarang'}
          </Button>
          {data.identity && (
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="h-11 px-3 rounded-xl text-slate-500 hover:text-slate-700"
              title="Bersihkan input"
            >
              <RotateCcw className="size-4" />
            </Button>
          )}
        </div>
      </form>

      {/* Pesan Error Jika Tidak Ditemukan */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 shadow-2xs">
          <AlertCircle className="size-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Kartu Hasil Saldo */}
      {result && (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/70 to-white p-6 shadow-md dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3 border-b border-emerald-100 dark:border-emerald-900/40 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                <User className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {result.name}
                </h3>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {result.nis && (
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                      NIS: {result.nis}
                    </span>
                  )}
                  {result.class_name && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100/80 px-1.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <GraduationCap className="size-3" />
                      Kelas {result.class_name} {result.major ? `(${result.major})` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] uppercase font-bold">
              Aktif
            </Badge>
          </div>

          <div className="mt-5 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Saldo Deposit Tersedia
            </span>
            <div className="mt-1 font-mono text-3xl sm:text-4xl font-black text-emerald-700 dark:text-emerald-400">
              <Money amount={result.balance} />
            </div>
            <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
              Siap digunakan untuk transaksi di S-Mart
            </p>
          </div>

          {result.point_balance > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 p-3 text-xs">
              <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-300">
                <Coins className="size-4 text-amber-600" />
                <span>Poin Reward Santri:</span>
              </div>
              <span className="font-mono font-extrabold text-amber-700 dark:text-amber-400">
                {result.point_balance.toLocaleString('id-ID')} Poin
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

CheckBalance.layout = (page: ReactElement) => <PublicLayout>{page}</PublicLayout>

