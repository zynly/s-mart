import { useForm } from '@inertiajs/react'
import { Wallet } from 'lucide-react'
import type { ReactElement } from 'react'
import PublicLayout from '@/Layouts/PublicLayout'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { formatMoney } from '@/Lib/money'

type CheckBalanceProps = {
  result?: { name: string; balance: number }
  error?: string
  submittedNumber?: string
}

export default function CheckBalance({ result, error, submittedNumber }: CheckBalanceProps) {
  const { data, setData, post, processing } = useForm({ member_number: submittedNumber ?? '', birth_date: '' })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    post(route('cek-saldo.check'))
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-content">Cek Saldo</h1>
        <p className="mt-1 text-sm text-content-muted">Masukkan nomor anggota &amp; tanggal lahir untuk melihat saldo deposit.</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6">
        <Label htmlFor="member_number">Nomor Anggota</Label>
        <Input
          id="member_number"
          value={data.member_number}
          onChange={(e) => setData('member_number', e.target.value)}
          placeholder="Contoh: 202600001"
          autoFocus
        />
        <Label htmlFor="birth_date">Tanggal Lahir</Label>
        <Input
          id="birth_date"
          type="date"
          value={data.birth_date}
          onChange={(e) => setData('birth_date', e.target.value)}
        />
        <Button type="submit" disabled={processing} className="mt-1">
          Cek Saldo
        </Button>
      </form>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-center text-sm text-danger">
          {error}
        </div>
      )}

      {result && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface p-6 text-center">
          <div className="rounded-full bg-navy-100 p-3 text-navy-700 dark:bg-navy-800 dark:text-navy-200">
            <Wallet className="size-6" />
          </div>
          <p className="text-sm text-content-muted">{result.name}</p>
          <p className="font-mono text-2xl font-semibold tabular-nums text-content">{formatMoney(result.balance)}</p>
        </div>
      )}
    </div>
  )
}

CheckBalance.layout = (page: ReactElement) => <PublicLayout>{page}</PublicLayout>
