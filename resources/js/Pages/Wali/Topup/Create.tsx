import { useForm } from '@inertiajs/react'
import type { FormEventHandler, ReactElement } from 'react'
import WaliLayout from '@/Layouts/WaliLayout'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { MoneyInput } from '@/Components/common/MoneyInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { EmptyState } from '@/Components/common/EmptyState'
import { newIdempotencyKey } from '@/Lib/idempotency'

type MemberOption = { id: number; name: string; member_number: string }

type CreateProps = {
  members: MemberOption[]
}

export default function Create({ members }: CreateProps) {
  const { data, setData, post, processing, errors } = useForm({
    member_id: members[0] ? String(members[0].id) : '',
    amount: 0,
    proof_image: null as File | null,
    bank_name: '',
    sender_name: '',
    transfer_date: '',
  })

  const submit: FormEventHandler = (e) => {
    e.preventDefault()
    post(route('wali.topup.store'), {
      forceFormData: true,
      headers: { 'X-Idempotency-Key': newIdempotencyKey() },
    })
  }

  if (members.length === 0) {
    return <EmptyState title="Belum ada anak terhubung" description="Hubungi admin sekolah untuk menghubungkan akun wali Anda." />
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-content">Ajukan Top-Up</h1>
      <p className="text-sm text-content-muted">
        Transfer ke rekening sekolah terlebih dahulu, lalu unggah bukti transfer di sini. Admin akan memverifikasi dan
        saldo akan bertambah setelah diverifikasi.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="space-y-1.5">
          <Label>Anak</Label>
          <Select value={data.member_id} onValueChange={(v) => setData('member_id', v)}>
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
          <MoneyInput value={data.amount} onChange={(v) => setData('amount', v)} />
          {errors.amount && <p className="text-sm text-danger">{errors.amount}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Nama Bank</Label>
          <Input value={data.bank_name} onChange={(e) => setData('bank_name', e.target.value)} placeholder="mis. BCA, BRI, Mandiri" />
        </div>

        <div className="space-y-1.5">
          <Label>Nama Pengirim</Label>
          <Input value={data.sender_name} onChange={(e) => setData('sender_name', e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Tanggal Transfer</Label>
          <Input type="date" value={data.transfer_date} onChange={(e) => setData('transfer_date', e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="proof_image">Bukti Transfer</Label>
          <Input
            id="proof_image"
            type="file"
            accept="image/*"
            onChange={(e) => setData('proof_image', e.target.files?.[0] ?? null)}
          />
          {errors.proof_image && <p className="text-sm text-danger">{errors.proof_image}</p>}
        </div>

        <Button type="submit" disabled={processing} className="w-full">
          Kirim Pengajuan
        </Button>
      </form>
    </div>
  )
}

Create.layout = (page: ReactElement) => <WaliLayout active="topup">{page}</WaliLayout>
