import { router, useForm } from '@inertiajs/react'
import { useState, type FormEventHandler, type ReactElement } from 'react'
import {
  AlertCircle, ArrowRight, Building2, Calendar, Check, CheckCircle2,
  CreditCard, FileText, PlusCircle, QrCode, ShieldCheck, UploadCloud, User, Wallet, Zap,
} from 'lucide-react'
import WaliLayout from '@/Layouts/WaliLayout'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { MoneyInput } from '@/Components/common/MoneyInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { EmptyState } from '@/Components/common/EmptyState'
import { Card, CardContent } from '@/Components/ui/card'
import { Money } from '@/Components/common/Money'
import { newIdempotencyKey } from '@/Lib/idempotency'
import { apiPost, ApiError } from '@/Lib/api'
import { useMidtransSnap } from '@/Hooks/useMidtransSnap'
import { cn } from '@/Lib/utils'

type MemberOption = { id: number; name: string; member_number: string }

type CreateProps = {
  members: MemberOption[]
  midtransClientKey: string | null
  midtransIsProduction: boolean
  minTopup: number
  allowAutoTopup?: boolean
  allowManualTopup?: boolean
  manualBankName?: string
  manualBankAccountNumber?: string
  manualBankAccountName?: string
}

const QUICK_AMOUNTS = [20000, 50000, 100000, 200000, 500000]

export default function Create({
  members,
  midtransClientKey,
  midtransIsProduction,
  minTopup,
  allowAutoTopup = true,
  allowManualTopup = true,
  manualBankName = 'BSI (Bank Syariah Indonesia)',
  manualBankAccountNumber = '7123456789',
  manualBankAccountName = 'SMK Skill Village Islamic School',
}: CreateProps) {
  const defaultMode = allowAutoTopup ? 'midtrans' : allowManualTopup ? 'manual' : 'none'
  const [mode, setMode] = useState<'midtrans' | 'manual' | 'none'>(defaultMode)
  const [gatewayMemberId, setGatewayMemberId] = useState(members[0] ? String(members[0].id) : '')
  const [gatewayAmount, setGatewayAmount] = useState(100000)
  const [gatewaySubmitting, setGatewaySubmitting] = useState(false)
  const [gatewayError, setGatewayError] = useState<string | null>(null)
  const snap = useMidtransSnap(midtransClientKey, midtransIsProduction)

  const form = useForm({
    member_id: members[0] ? String(members[0].id) : '',
    amount: 100000,
    proof_image: null as File | null,
    bank_name: '',
    sender_name: '',
    transfer_date: new Date().toISOString().split('T')[0],
  })

  const submitManual: FormEventHandler = (e) => {
    e.preventDefault()
    form.post(route('wali.topup.store'), {
      forceFormData: true,
      headers: { 'X-Idempotency-Key': newIdempotencyKey() },
    })
  }

  async function payWithMidtrans() {
    if (gatewayAmount < minTopup) {
      setGatewayError(`Nominal minimal top-up adalah Rp ${minTopup.toLocaleString('id-ID')}.`)
      return
    }

    setGatewaySubmitting(true)
    setGatewayError(null)

    try {
      const res = await apiPost<{ provider?: string; token?: string; payment_url?: string; reference: string }>(route('wali.topup.midtrans'), {
        member_id: Number(gatewayMemberId),
        amount: gatewayAmount,
      })

      if (res.provider === 'pakasir' || res.payment_url) {
        window.location.href = res.payment_url || ''
      } else if (res.token) {
        snap.pay(res.token, {
          onSuccess: () => router.visit(route('wali.members.show', gatewayMemberId)),
          onPending: () => router.visit(route('wali.members.show', gatewayMemberId)),
          onError: () => setGatewayError('Pembayaran gagal diproses. Silakan coba lagi.'),
          onClose: () => setGatewaySubmitting(false),
        })
      }
    } catch (err) {
      setGatewayError(err instanceof ApiError ? err.firstError() : 'Gagal memulai pembayaran.')
    } finally {
      setGatewaySubmitting(false)
    }
  }

  if (members.length === 0) {
    return <EmptyState title="Belum ada anak terhubung" description="Hubungi admin sekolah untuk menghubungkan akun wali Anda." />
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      {/* Header Title */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Ajukan Top-Up Saldo
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Isi saldo dompet santri secara instan via QRIS, E-Wallet, atau Transfer Bank.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
          <ShieldCheck className="size-3.5 text-amber-600 dark:text-amber-400" />
          Pembayaran Resmi &amp; Aman
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      {allowAutoTopup && allowManualTopup && (
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200/80 bg-slate-100/70 p-1.5 dark:border-slate-800 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={() => setMode('midtrans')}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl py-3 px-3 text-xs sm:text-sm font-bold transition-all duration-200 shadow-2xs',
              mode === 'midtrans'
                ? 'bg-white text-navy-950 shadow-md dark:bg-amber-500 dark:text-navy-950'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
            )}
          >
            <Zap className={cn('size-4', mode === 'midtrans' ? 'text-amber-500 fill-amber-500 dark:text-navy-950 dark:fill-navy-950' : '')} />
            <span>Bayar Otomatis</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('manual')}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl py-3 px-3 text-xs sm:text-sm font-bold transition-all duration-200 shadow-2xs',
              mode === 'manual'
                ? 'bg-white text-navy-950 shadow-md dark:bg-amber-500 dark:text-navy-950'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
            )}
          >
            <Building2 className="size-4" />
            <span>Transfer Manual</span>
          </button>
        </div>
      )}

      {/* Bayar Otomatis View */}
      {mode === 'midtrans' ? (
        <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
            {/* Target Child Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pilih Santri Penerima Saldo
              </Label>
              <Select value={gatewayMemberId} onValueChange={setGatewayMemberId}>
                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50/50 text-sm font-semibold dark:border-slate-800 dark:bg-slate-800/50">
                  <SelectValue placeholder="Pilih anak santri..." />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)} className="py-2.5">
                      <span className="font-bold text-slate-900 dark:text-white">{m.name}</span>
                      <span className="ml-2 text-xs text-slate-400">({m.member_number})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Amount Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Nominal Top-Up
                </Label>
                <span className="text-xs text-slate-400">Minimal Rp {minTopup.toLocaleString('id-ID')}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {QUICK_AMOUNTS.map((amt) => {
                  const isSelected = gatewayAmount === amt

                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setGatewayAmount(amt)
                        setGatewayError(null)
                      }}
                      className={cn(
                        'flex flex-col items-center justify-center rounded-xl border py-2.5 px-2 text-xs font-bold transition-all duration-150',
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:border-amber-400 dark:bg-amber-400/20 dark:text-amber-300 ring-2 ring-amber-500/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300',
                      )}
                    >
                      <span>Rp {(amt / 1000).toLocaleString('id-ID')}rb</span>
                      {isSelected && <Check className="mt-1 size-3 text-amber-600 dark:text-amber-400" />}
                    </button>
                  )
                })}
              </div>

              <div className="mt-3">
                <MoneyInput
                  value={gatewayAmount}
                  onChange={(val) => {
                    setGatewayAmount(val)
                    setGatewayError(null)
                  }}
                  className="h-12 rounded-xl text-base font-bold"
                />
              </div>

              {gatewayError && (
                <div className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-semibold text-red-600 dark:text-red-400">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{gatewayError}</span>
                </div>
              )}
            </div>

            {/* Payment Channel Highlights */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Metode Pembayaran Instan Didukung:
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <QrCode className="size-3.5 text-slate-400" />
                  <span>QRIS &amp; GoPay / ShopeePay</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CreditCard className="size-3.5 text-slate-400" />
                  <span>Virtual Account (BCA, Mandiri, BRI)</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="button"
              size="lg"
              onClick={() => void payWithMidtrans()}
              disabled={gatewaySubmitting}
              className="h-13 gap-2 rounded-xl bg-gradient-to-r from-navy-900 via-navy-800 to-navy-950 text-base font-bold text-white shadow-lg shadow-navy-950/20 hover:from-navy-950 hover:to-navy-900 dark:from-amber-500 dark:via-amber-400 dark:to-amber-500 dark:text-navy-950 transition-all duration-200 active:scale-[0.98]"
            >
              <Zap className="size-5 fill-current" />
              {gatewaySubmitting ? 'Memproses Transaksi…' : 'Bayar Sekarang via Midtrans'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Transfer Manual View */
        <Card className="border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
            {/* School Bank Info Card */}
            <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-4">
              <div className="flex items-center gap-2 mb-2 text-amber-800 dark:text-amber-300">
                <Building2 className="size-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Rekening Tujuan Transfer Sekolah</span>
              </div>
              <div className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
                <p className="font-semibold">Bank: <strong className="text-slate-900 dark:text-white">{manualBankName}</strong></p>
                <p className="font-semibold">No. Rekening: <strong className="text-slate-900 dark:text-white font-mono text-sm">{manualBankAccountNumber}</strong></p>
                <p className="font-semibold">Atas Nama: <strong className="text-slate-900 dark:text-white">{manualBankAccountName}</strong></p>
              </div>
              <p className="mt-3 text-[11px] text-amber-700 dark:text-amber-400 italic">
                *Transfer tepat sesuai nominal, lalu simpan &amp; unggah foto bukti transfer di bawah ini.
              </p>
            </div>

            <form onSubmit={submitManual} className="flex flex-col gap-4">
              {/* Select Child */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Pilih Santri Penerima Saldo
                </Label>
                <Select value={form.data.member_id} onValueChange={(v) => form.setData('member_id', v)}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/50 text-sm font-semibold dark:border-slate-800 dark:bg-slate-800/50">
                    <SelectValue placeholder="Pilih anak santri..." />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        <span className="font-bold text-slate-900 dark:text-white">{m.name}</span> ({m.member_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Nominal Top-Up */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Nominal Transfer
                </Label>
                <MoneyInput
                  value={form.data.amount}
                  onChange={(v) => form.setData('amount', v)}
                  className="h-11 rounded-xl text-base font-bold"
                />
                {form.errors.amount && <p className="text-xs text-red-600 font-semibold">{form.errors.amount}</p>}
              </div>

              {/* Nama Bank */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Nama Bank Anda (Pengirim)
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3.5 size-4 text-slate-400" />
                  <Input
                    value={form.data.bank_name}
                    onChange={(e) => form.setData('bank_name', e.target.value)}
                    placeholder="Contoh: BCA, BRI, Mandiri"
                    className="h-11 pl-10 rounded-xl"
                  />
                </div>
              </div>

              {/* Nama Pengirim */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Nama Pemilik Rekening Pengirim
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 size-4 text-slate-400" />
                  <Input
                    value={form.data.sender_name}
                    onChange={(e) => form.setData('sender_name', e.target.value)}
                    placeholder="Nama sesuai buku tabungan/rekening"
                    className="h-11 pl-10 rounded-xl"
                  />
                </div>
              </div>

              {/* Tanggal Transfer */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Tanggal Transfer
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3.5 size-4 text-slate-400" />
                  <Input
                    type="date"
                    value={form.data.transfer_date}
                    onChange={(e) => form.setData('transfer_date', e.target.value)}
                    className="h-11 pl-10 rounded-xl"
                  />
                </div>
              </div>

              {/* Upload Bukti Transfer */}
              <div className="space-y-1.5">
                <Label htmlFor="proof_image" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Foto Bukti Transfer (Wajib)
                </Label>
                <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50 transition-colors">
                  <UploadCloud className="size-8 text-amber-500 mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {form.data.proof_image ? form.data.proof_image.name : 'Klik untuk memilih foto bukti transfer'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Format: JPG, PNG, atau WEBP (Maksimal 4MB)</p>
                  <Input
                    id="proof_image"
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 size-full opacity-0 cursor-pointer"
                    onChange={(e) => form.setData('proof_image', e.target.files?.[0] ?? null)}
                  />
                </div>
                {form.errors.proof_image && <p className="text-xs text-red-600 font-semibold">{form.errors.proof_image}</p>}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={form.processing}
                className="h-12 gap-2 rounded-xl bg-navy-900 hover:bg-navy-950 font-bold text-white shadow-md dark:bg-amber-500 dark:text-navy-950 transition-all mt-2"
              >
                <FileText className="size-4" />
                {form.processing ? 'Mengirim Pengajuan…' : 'Kirim Pengajuan Top-Up Manual'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

Create.layout = (page: ReactElement) => <WaliLayout active="topup">{page}</WaliLayout>
