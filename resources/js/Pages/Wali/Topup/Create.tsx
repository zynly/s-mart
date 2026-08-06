import { router, useForm } from '@inertiajs/react'
import { useState, type FormEventHandler, type ReactElement } from 'react'
import WaliLayout from '@/Layouts/WaliLayout'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { MoneyInput } from '@/Components/common/MoneyInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { EmptyState } from '@/Components/common/EmptyState'
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
}

const QUICK_AMOUNTS = [20000, 50000, 100000, 200000]

export default function Create({ members, midtransClientKey, midtransIsProduction, minTopup }: CreateProps) {
  const [mode, setMode] = useState<'midtrans' | 'manual'>('midtrans')
  const [gatewayMemberId, setGatewayMemberId] = useState(members[0] ? String(members[0].id) : '')
  const [gatewayAmount, setGatewayAmount] = useState(0)
  const [gatewaySubmitting, setGatewaySubmitting] = useState(false)
  const [gatewayError, setGatewayError] = useState<string | null>(null)
  const snap = useMidtransSnap(midtransClientKey, midtransIsProduction)

  const form = useForm({
    member_id: members[0] ? String(members[0].id) : '',
    amount: 0,
    proof_image: null as File | null,
    bank_name: '',
    sender_name: '',
    transfer_date: '',
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
      setGatewayError(`Nominal minimal Rp ${minTopup.toLocaleString('id-ID')}.`)
      return
    }

    setGatewaySubmitting(true)
    setGatewayError(null)

    try {
      const { token } = await apiPost<{ token: string; reference: string }>(route('wali.topup.midtrans'), {
        member_id: Number(gatewayMemberId),
        amount: gatewayAmount,
      })

      snap.pay(token, {
        onSuccess: () => router.visit(route('wali.members.show', gatewayMemberId)),
        onPending: () => router.visit(route('wali.members.show', gatewayMemberId)),
        onError: () => setGatewayError('Pembayaran gagal diproses. Silakan coba lagi.'),
        onClose: () => setGatewaySubmitting(false),
      })
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
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-content">Ajukan Top-Up</h1>

      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-1">
        <button
          type="button"
          onClick={() => setMode('midtrans')}
          className={cn('rounded-md py-2 text-sm font-medium transition-colors', mode === 'midtrans' ? 'bg-primary text-primary-foreground' : 'text-content-muted hover:bg-bg')}
        >
          Bayar Otomatis
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={cn('rounded-md py-2 text-sm font-medium transition-colors', mode === 'manual' ? 'bg-primary text-primary-foreground' : 'text-content-muted hover:bg-bg')}
        >
          Transfer Manual
        </button>
      </div>

      {mode === 'midtrans' ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-content-muted">
            Bayar langsung via QRIS, transfer bank, atau e-wallet — saldo bertambah otomatis begitu pembayaran selesai,
            tanpa menunggu verifikasi admin.
          </p>

          <div className="space-y-1.5">
            <Label>Anak</Label>
            <Select value={gatewayMemberId} onValueChange={setGatewayMemberId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.name} ({m.member_number})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Nominal Top-Up</Label>
            <MoneyInput value={gatewayAmount} onChange={setGatewayAmount} />
            <div className="flex flex-wrap gap-1.5">
              {QUICK_AMOUNTS.map((amt) => (
                <Button key={amt} type="button" variant="outline" size="sm" onClick={() => setGatewayAmount(amt)}>
                  {amt / 1000}rb
                </Button>
              ))}
            </div>
            {gatewayError && <p className="text-sm text-danger">{gatewayError}</p>}
          </div>

          <Button type="button" onClick={() => void payWithMidtrans()} disabled={gatewaySubmitting} className="w-full">
            {gatewaySubmitting ? 'Memproses…' : 'Bayar Sekarang'}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-content-muted">
            Transfer ke rekening sekolah terlebih dahulu, lalu unggah bukti transfer di sini. Admin akan memverifikasi
            dan saldo akan bertambah setelah diverifikasi.
          </p>

          <form onSubmit={submitManual} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label>Anak</Label>
              <Select value={form.data.member_id} onValueChange={(v) => form.setData('member_id', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.name} ({m.member_number})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Nominal Top-Up</Label>
              <MoneyInput value={form.data.amount} onChange={(v) => form.setData('amount', v)} />
              {form.errors.amount && <p className="text-sm text-danger">{form.errors.amount}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Nama Bank</Label>
              <Input value={form.data.bank_name} onChange={(e) => form.setData('bank_name', e.target.value)} placeholder="mis. BCA, BRI, Mandiri" />
            </div>

            <div className="space-y-1.5">
              <Label>Nama Pengirim</Label>
              <Input value={form.data.sender_name} onChange={(e) => form.setData('sender_name', e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Tanggal Transfer</Label>
              <Input type="date" value={form.data.transfer_date} onChange={(e) => form.setData('transfer_date', e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="proof_image">Bukti Transfer</Label>
              <Input
                id="proof_image"
                type="file"
                accept="image/*"
                onChange={(e) => form.setData('proof_image', e.target.files?.[0] ?? null)}
              />
              {form.errors.proof_image && <p className="text-sm text-danger">{form.errors.proof_image}</p>}
            </div>

            <Button type="submit" disabled={form.processing} className="w-full">
              Kirim Pengajuan
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}

Create.layout = (page: ReactElement) => <WaliLayout active="topup">{page}</WaliLayout>
