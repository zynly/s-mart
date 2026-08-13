import { useState, type ReactElement } from 'react'
import { router } from '@inertiajs/react'
import type { ColumnDef } from '@tanstack/react-table'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { PageTabs } from '@/Components/common/PageTabs'
import { DataTable } from '@/Components/common/DataTable'
import { Money } from '@/Components/common/Money'
import { Button } from '@/Components/ui/button'
import { Badge } from '@/Components/ui/badge'
import { Textarea } from '@/Components/ui/textarea'
import { Checkbox } from '@/Components/ui/checkbox'
import { Label } from '@/Components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { SupervisorPinDialog } from '@/Components/common/SupervisorPinDialog'
import { Check, Eye, ExternalLink, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/Lib/utils'
import type { Paginated } from '@/Types'

type TopupRequestRow = {
  id: number
  reference: string
  amount: number
  bank_name: string | null
  sender_name: string | null
  transfer_date: string | null
  proof_image: string | null
  status: string
  created_at: string
  member: { id: number; name: string; member_number: string } | null
  guardian: { id: number; name: string; phone: string } | null
  verifier: { id: number; name: string } | null
  is_possible_duplicate: boolean
}

// REVISI-R1-v2.md §6.3 Jalur B — wajib PIN supervisor/owner di atas ambang ini.
const TRANSFER_PIN_THRESHOLD = 500000

type TopupRequestsIndexProps = {
  tab: string
  topupRequests: Paginated<TopupRequestRow>
  filters: { status?: string }
}

const STATUS_LABELS: Record<string, string> = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' }
const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-warning text-white',
  approved: 'bg-success text-white',
  rejected: 'bg-danger text-white',
}

export default function Index({ tab, topupRequests, filters }: TopupRequestsIndexProps) {
  const [statusFilter, setStatusFilter] = useState(filters.status ?? '')
  const [rejectTarget, setRejectTarget] = useState<TopupRequestRow | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [approveTarget, setApproveTarget] = useState<TopupRequestRow | null>(null)
  const [bankVerified, setBankVerified] = useState(false)
  const [approveNote, setApproveNote] = useState('')
  const [approvePinOpen, setApprovePinOpen] = useState(false)
  const [previewProofTarget, setPreviewProofTarget] = useState<TopupRequestRow | null>(null)

  function applyFilter(status: string) {
    setStatusFilter(status)
    router.get(route('admin.topup-requests.index'), { status }, { preserveState: true, replace: true })
  }

  function submitApprove() {
    if (!approveTarget || !bankVerified) return

    // REVISI-R1-v2.md §6.3 Jalur B — nominal besar butuh PIN
    // supervisor/owner SEBELUM disetujui, di atas checkbox konfirmasi
    // mutasi rekening yang sudah ada.
    if (approveTarget.amount > TRANSFER_PIN_THRESHOLD) {
      setApprovePinOpen(true)
      return
    }

    doSubmitApprove()
  }

  function doSubmitApprove(token?: string) {
    if (!approveTarget) return

    router.put(route('admin.topup-requests.approve', approveTarget.id), { bank_verified: bankVerified, note: approveNote, approval_token: token ?? '' }, {
      onSuccess: () => {
        setApproveTarget(null)
        setBankVerified(false)
        setApproveNote('')
        setApprovePinOpen(false)
      },
    })
  }

  function submitReject() {
    if (!rejectTarget) return

    router.put(route('admin.topup-requests.reject', rejectTarget.id), { reject_reason: rejectReason }, {
      onSuccess: () => {
        setRejectTarget(null)
        setRejectReason('')
      },
    })
  }

  const columns: ColumnDef<TopupRequestRow, unknown>[] = [
    { accessorKey: 'reference', header: 'Referensi' },
    { id: 'member', header: 'Anak', cell: ({ row }) => row.original.member?.name ?? '—' },
    { id: 'guardian', header: 'Wali', cell: ({ row }) => row.original.guardian?.name ?? '—' },
    {
      id: 'amount',
      header: 'Nominal',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Money amount={row.original.amount} />
          {row.original.is_possible_duplicate && (
            <Badge className="bg-warning text-white" title="Ada pengajuan lain dengan nominal & tanggal transfer yang sama — periksa bukti dengan teliti sebelum menyetujui.">
              Duga Duplikat
            </Badge>
          )}
        </div>
      ),
    },
    { id: 'bank', header: 'Bank / Pengirim', cell: ({ row }) => `${row.original.bank_name ?? '—'} / ${row.original.sender_name ?? '—'}` },
    {
      id: 'proof',
      header: 'Bukti Transfer',
      cell: ({ row }) => row.original.proof_image ? (
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 font-bold text-xs border-amber-500/40 text-amber-900 bg-amber-50 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50 shadow-xs cursor-pointer"
          onClick={() => setPreviewProofTarget(row.original)}
        >
          <Eye className="size-3.5" />
          Lihat Bukti
        </Button>
      ) : (
        <span className="text-xs text-slate-400 dark:text-slate-600">—</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge className={STATUS_BADGE[row.original.status] ?? ''}>{STATUS_LABELS[row.original.status] ?? row.original.status}</Badge>,
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => row.original.status === 'pending' ? (
        <div className="flex gap-2">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={() => setApproveTarget(row.original)}>Setujui</Button>
          <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950" onClick={() => setRejectTarget(row.original)}>Tolak</Button>
        </div>
      ) : (
        <span className="text-xs text-content-muted">{row.original.verifier?.name}</span>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Verifikasi Top-Up Wali" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Verifikasi Top-Up Wali' }]} />
      <PageTabs current={tab} tabs={[
        { key: 'deposit', label: 'Deposit', href: route('admin.deposit.index'), permission: 'deposit.view' },
        { key: 'topup-requests', label: 'Verifikasi Top-Up Wali', href: route('admin.topup-requests.index'), permission: 'topup.view' },
      ]} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1">Status:</span>
        <button
          type="button"
          onClick={() => applyFilter('')}
          className={cn(
            'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer select-none',
            !statusFilter
              ? 'border-amber-500 bg-amber-500/15 text-amber-950 dark:text-amber-300 ring-2 ring-amber-500/30 shadow-xs'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
          )}
        >
          <span className={cn('size-2 rounded-full', !statusFilter ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700')} />
          Semua Status
        </button>
        {['pending', 'approved', 'rejected'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => applyFilter(st)}
            className={cn(
              'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer select-none capitalize',
              statusFilter === st
                ? 'border-amber-500 bg-amber-500/15 text-amber-950 dark:text-amber-300 ring-2 ring-amber-500/30 shadow-xs'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
            )}
          >
            <span className={cn('size-2 rounded-full', statusFilter === st ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700')} />
            {STATUS_LABELS[st] ?? st}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={topupRequests.data}
        getRowId={(row) => String(row.id)}
        emptyDescription="Belum ada pengajuan top-up dari wali."
        pagination={{
          page: topupRequests.current_page,
          perPage: topupRequests.per_page,
          total: topupRequests.total,
          onPageChange: (page) => router.get(route('admin.topup-requests.index'), { status: statusFilter, page }, { preserveState: true }),
        }}
      />

      {/* Modal Preview Bukti Transfer */}
      <Dialog open={previewProofTarget !== null} onOpenChange={(open) => !open && setPreviewProofTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="size-5 text-amber-600 dark:text-amber-400" />
              Bukti Transfer — {previewProofTarget?.reference}
            </DialogTitle>
          </DialogHeader>
          {previewProofTarget && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div><span className="font-semibold text-slate-500">Santri:</span> {previewProofTarget.member?.name}</div>
                <div><span className="font-semibold text-slate-500">Wali:</span> {previewProofTarget.guardian?.name}</div>
                <div><span className="font-semibold text-slate-500">Nominal:</span> <Money amount={previewProofTarget.amount} className="font-bold text-amber-600 dark:text-amber-400" /></div>
                <div><span className="font-semibold text-slate-500">Bank / Pengirim:</span> {previewProofTarget.bank_name ?? '—'} / {previewProofTarget.sender_name ?? '—'}</div>
                <div><span className="font-semibold text-slate-500">Tgl Transfer:</span> {previewProofTarget.transfer_date ?? '—'}</div>
                <div><span className="font-semibold text-slate-500">Status:</span> <Badge className={STATUS_BADGE[previewProofTarget.status] ?? ''}>{STATUS_LABELS[previewProofTarget.status] ?? previewProofTarget.status}</Badge></div>
              </div>

              <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-black/5 dark:bg-black/40 flex items-center justify-center p-2 min-h-[300px]">
                <img
                  src={route('admin.topup-requests.proof', previewProofTarget.id)}
                  alt="Foto Bukti Transfer"
                  className="max-h-[450px] w-auto object-contain rounded-lg shadow-md"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            {previewProofTarget && (
              <a
                href={route('admin.topup-requests.proof', previewProofTarget.id)}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-amber-600 hover:underline flex items-center gap-1 font-semibold"
              >
                <ExternalLink className="size-3.5" /> Buka Tab Baru / Download
              </a>
            )}
            {previewProofTarget?.status === 'pending' && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={() => {
                  const target = previewProofTarget
                  setPreviewProofTarget(null)
                  setApproveTarget(target)
                }}
              >
                Lanjut Verifikasi &amp; Setujui
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog Approve */}
      <Dialog
        open={approveTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setApproveTarget(null)
            setBankVerified(false)
            setApproveNote('')
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="size-5 text-emerald-600" />
              Setujui Top-Up — {approveTarget?.reference}
            </DialogTitle>
          </DialogHeader>

          {approveTarget && (
            <div className="flex flex-col gap-4">
              {/* Rincian Detail Transaksi Top-Up */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-900/70 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400 block">Santri:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{approveTarget.member?.name ?? '—'}</span>
                  {approveTarget.member?.member_number && (
                    <span className="text-[10px] text-slate-400 block">({approveTarget.member.member_number})</span>
                  )}
                </div>
                <div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400 block">Wali Santri:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{approveTarget.guardian?.name ?? '—'}</span>
                  {approveTarget.guardian?.phone && (
                    <span className="text-[10px] text-slate-400 block">({approveTarget.guardian.phone})</span>
                  )}
                </div>
                <div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400 block">Nominal Top-Up:</span>
                  <Money amount={approveTarget.amount} className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400 block">Bank / Pengirim:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{approveTarget.bank_name ?? '—'}</span>
                  <span className="text-[11px] text-slate-500 block">a.n {approveTarget.sender_name ?? '—'}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400 block">Tanggal Transfer:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{approveTarget.transfer_date ?? '—'}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400 block">Tanggal Pengajuan:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{approveTarget.created_at ? new Date(approveTarget.created_at).toLocaleDateString('id-ID') : '—'}</span>
                </div>
              </div>

              {/* Pratinjau Foto Bukti Transfer di dalam Dialog Approve */}
              {approveTarget.proof_image ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1.5"><ImageIcon className="size-4 text-amber-600" /> Foto Bukti Transfer:</span>
                    <a
                      href={route('admin.topup-requests.proof', approveTarget.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-600 dark:text-amber-400 hover:underline text-xs flex items-center gap-1 font-semibold"
                    >
                      <ExternalLink className="size-3" /> Perbesar / Buka Tab Baru
                    </a>
                  </div>
                  <div className="relative max-h-56 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 flex justify-center bg-black/5 dark:bg-black/40 p-1">
                    <img
                      src={route('admin.topup-requests.proof', approveTarget.id)}
                      alt="Bukti Transfer"
                      className="max-h-52 object-contain rounded-md"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-3 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30">
                  Tidak ada foto lampiran bukti transfer.
                </div>
              )}

              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                <Checkbox id="bank_verified" checked={bankVerified} onCheckedChange={(v) => setBankVerified(v === true)} className="mt-0.5" />
                <Label htmlFor="bank_verified" className="font-semibold text-xs text-slate-900 dark:text-slate-100 cursor-pointer leading-relaxed">
                  Saya sudah mencocokkan pengajuan ini dengan mutasi rekening koran sekolah — bukan hanya melihat foto bukti transfer.
                </Label>
              </div>
              {approveTarget.is_possible_duplicate && (
                <p className="rounded-xl border border-amber-500/40 bg-warning/10 p-3 text-xs font-semibold text-warning">
                  ⚠ Ada pengajuan top-up LAIN dengan nominal &amp; tanggal transfer yang sama persis — periksa dengan teliti, kemungkinan bukti transfer dipakai berulang.
                </p>
              )}
              {approveTarget.amount > TRANSFER_PIN_THRESHOLD && (
                <p className="text-xs font-medium text-slate-500">Nominal di atas Rp {TRANSFER_PIN_THRESHOLD.toLocaleString('id-ID')} — PIN supervisor/owner akan diminta setelah ini.</p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="approve_note" className="text-xs font-bold">Catatan (opsional)</Label>
                <Textarea id="approve_note" value={approveNote} onChange={(e) => setApproveNote(e.target.value)} placeholder="Mis. dicocokkan dengan mutasi BCA 01/08" className="text-xs" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={submitApprove} disabled={!bankVerified} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Setujui &amp; Tambah Saldo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SupervisorPinDialog
        open={approvePinOpen}
        onOpenChange={setApprovePinOpen}
        permission="topup.approve"
        title="Konfirmasi Top-Up Nominal Besar"
        description={`Top-up di atas Rp ${TRANSFER_PIN_THRESHOLD.toLocaleString('id-ID')} wajib PIN supervisor/owner.`}
        onApproved={(token) => doSubmitApprove(token)}
      />

      <Dialog open={rejectTarget !== null} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Top-Up — {rejectTarget?.reference}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Alasan penolakan" />
          </div>
          <DialogFooter>
            <Button onClick={submitReject} disabled={!rejectReason.trim()} variant="destructive">Tolak Pengajuan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
