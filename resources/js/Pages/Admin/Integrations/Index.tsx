import { useState, type ReactElement } from 'react'
import {
  CheckCircle2, XCircle, RefreshCw, HardDrive, CreditCard,
  Mail, Database, ShieldCheck, Save, Banknote,
  Wallet, Ticket, Star, ClipboardList, Clock, QrCode,
  Smartphone, Building2, Users, Zap,
} from 'lucide-react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { Button } from '@/Components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card'
import { Badge } from '@/Components/ui/badge'
import { Checkbox } from '@/Components/ui/checkbox'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { apiPost } from '@/Lib/api'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

type WaliSettings = {
  allowWaliTopup: boolean
  allowAutoTopup: boolean
  allowManualTopup: boolean
  manualBankName: string
  manualBankAccountNumber: string
  manualBankAccountName: string
}

type EnvSummary = {
  appName: string; appEnv: string; dbConnection: string; dbHost: string
  dbDatabase: string; storageDisk: string; s3Bucket: string; s3Endpoint: string
  smtpHost: string; smtpPort: number; smtpEnable: boolean
  midtransIsProduction: boolean; midtransGatewayClass: string
  midtransServerKey: string; midtransClientKey: string
  pakasirSlug: string; pakasirBaseUrl: string; pakasirCallbackUrl: string; pakasirApiKey: string
}

type PaymentMethod = {
  id: number; code: string; name: string; type: string
  is_active: boolean; midtrans_code: string | null; midtrans_active: boolean
}

type MidtransChannel = {
  code: string; name: string; category: string; is_active: boolean
}

type TestResult = {
  success: boolean; message: string; latency_ms?: number
  channels?: MidtransChannel[]
}

type IndexProps = {
  envSummary: EnvSummary
  activeGateway?: string
  paymentMethods: PaymentMethod[]
  midtransChannels: MidtransChannel[]
  savedEnabledChannels: string[]
  waliSettings?: WaliSettings
}


// ─── Color + Icon per type ────────────────────────────────────────────────────

type TypeConfig = {
  icon: ReactElement
  iconBg: string
  activeBg: string
  activeBorder: string
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  cash:     { icon: <Banknote className="size-5" />,      iconBg: 'bg-emerald-100 text-emerald-700',  activeBg: 'bg-emerald-800',   activeBorder: 'border-emerald-600' },
  deposit:  { icon: <Wallet className="size-5" />,        iconBg: 'bg-sky-100 text-sky-700',          activeBg: 'bg-sky-800',       activeBorder: 'border-sky-600' },
  qris:     { icon: <QrCode className="size-5" />,        iconBg: 'bg-amber-100 text-amber-700',      activeBg: 'bg-amber-800',     activeBorder: 'border-amber-500' },
  ewallet:  { icon: <Smartphone className="size-5" />,    iconBg: 'bg-purple-100 text-purple-700',    activeBg: 'bg-purple-800',    activeBorder: 'border-purple-600' },
  transfer: { icon: <Building2 className="size-5" />,     iconBg: 'bg-indigo-100 text-indigo-700',    activeBg: 'bg-indigo-800',    activeBorder: 'border-indigo-600' },
  card:     { icon: <CreditCard className="size-5" />,    iconBg: 'bg-rose-100 text-rose-700',        activeBg: 'bg-rose-800',      activeBorder: 'border-rose-600' },
  voucher:  { icon: <Ticket className="size-5" />,        iconBg: 'bg-teal-100 text-teal-700',        activeBg: 'bg-teal-800',      activeBorder: 'border-teal-600' },
  point:    { icon: <Star className="size-5" />,          iconBg: 'bg-yellow-100 text-yellow-700',    activeBg: 'bg-yellow-800',    activeBorder: 'border-yellow-500' },
  credit:   { icon: <Clock className="size-5" />,         iconBg: 'bg-orange-100 text-orange-700',    activeBg: 'bg-orange-800',    activeBorder: 'border-orange-600' },
  payroll:  { icon: <ClipboardList className="size-5" />, iconBg: 'bg-slate-100 text-slate-700',      activeBg: 'bg-slate-700',     activeBorder: 'border-slate-500' },
}

const FALLBACK_CONFIG: TypeConfig = {
  icon: <Banknote className="size-5" />,
  iconBg: 'bg-emerald-100 text-emerald-700',
  activeBg: 'bg-emerald-800',
  activeBorder: 'border-emerald-600',
}


function maskKey(k: string) {
  if (!k || k === '-') return '-'
  return k.slice(0, 6) + '••••••' + k.slice(-4)
}

// ─── Result Banner ────────────────────────────────────────────────────────────
function ResultBanner({ result }: { result: TestResult | null }) {
  if (!result) return null
  return (
    <div className={`flex items-start gap-2 rounded-xl border p-3 text-xs
      ${result.success
        ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
        : 'border-red-200 bg-red-50 text-red-950'}`}>
      {result.success
        ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
        : <XCircle className="mt-0.5 size-4 shrink-0 text-red-600" />}
      <div>
        <p className="font-bold">{result.message}</p>
        {result.latency_ms !== undefined && (
          <p className="mt-0.5 font-mono text-[11px] text-emerald-700">Latency: {result.latency_ms} ms</p>
        )}
      </div>
    </div>
  )
}

// ─── Test Card ────────────────────────────────────────────────────────────────
function TestCard({
  icon, title, desc, badge, meta, result, loading, onTest,
}: {
  icon: ReactElement; title: string; desc: string; badge: ReactElement
  meta: [string, string][]; result: TestResult | null; loading: boolean; onTest: () => void
}) {
  return (
    <Card className="rounded-2xl border border-border/90 bg-surface shadow-sm">
      <CardHeader className="border-b border-border/80 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-navy-100">{icon}</div>
            <div>
              <CardTitle className="text-sm font-extrabold text-navy-950 dark:text-white">{title}</CardTitle>
              <CardDescription className="text-xs">{desc}</CardDescription>
            </div>
          </div>
          {badge}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <div className="rounded-xl border border-border bg-bg p-3 font-mono text-xs space-y-1.5">
          {meta.map(([k, v]) => (
            <p key={k} className="flex justify-between gap-2">
              <span className="shrink-0 text-content-muted">{k}:</span>
              <span className="truncate text-right font-bold text-content" title={v}>{v}</span>
            </p>
          ))}
        </div>
        <ResultBanner result={result} />
        <Button onClick={onTest} disabled={loading} className="w-full rounded-xl bg-navy-900 font-bold text-white hover:bg-navy-800">
          <RefreshCw className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Menguji...' : 'Uji Koneksi'}
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Default Channels Fallback jika API Sandbox belum mengembalikan list ────────
const DEFAULT_MIDTRANS_CHANNELS: MidtransChannel[] = [
  { code: 'qris', name: 'QRIS Dinamis (GoPay, OVO, ShopeePay, DANA, LinkAja)', category: 'qris', is_active: true },
  { code: 'gopay', name: 'GoPay / QRIS', category: 'ewallet', is_active: true },
  { code: 'shopeepay', name: 'ShopeePay', category: 'ewallet', is_active: true },
  { code: 'bca_va', name: 'BCA Virtual Account', category: 'bank_transfer', is_active: true },
  { code: 'bni_va', name: 'BNI Virtual Account', category: 'bank_transfer', is_active: true },
  { code: 'bri_va', name: 'BRI Virtual Account', category: 'bank_transfer', is_active: true },
  { code: 'mandiri_va', name: 'Mandiri Bill Payment', category: 'bank_transfer', is_active: true },
  { code: 'cimb_va', name: 'CIMB Niaga Virtual Account', category: 'bank_transfer', is_active: true },
  { code: 'permata_va', name: 'Permata Virtual Account', category: 'bank_transfer', is_active: true },
  { code: 'credit_card', name: 'Kartu Kredit / Debit Online (3DS)', category: 'card', is_active: true },
]

// ─── MethodCard (Khusus 1. Pembayaran Manual Toko) ───────────────────────────
function MethodCard({
  m, onToggle,
}: {
  m: PaymentMethod
  onToggle: (id: number, val: boolean) => void
}) {
  const cfg = TYPE_CONFIG[m.type] ?? FALLBACK_CONFIG!

  return (
    <div className={`flex flex-col justify-between rounded-2xl border p-3.5 transition-all
      ${m.is_active
        ? `${cfg.activeBg} ${cfg.activeBorder} shadow-md`
        : 'border-border/70 bg-white dark:bg-surface hover:shadow-sm'
      }`}
    >
      {/* Top: icon + checkbox */}
      <div className="flex items-start justify-between gap-1">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl
          ${m.is_active ? 'bg-white/20 text-white' : cfg.iconBg}`}>
          {cfg.icon}
        </div>
        <Checkbox
          id={`pm-${m.id}`}
          checked={m.is_active}
          onCheckedChange={(val) => onToggle(m.id, Boolean(val))}
          className={m.is_active
            ? 'border-white data-[state=checked]:bg-white data-[state=checked]:text-navy-900'
            : 'data-[state=checked]:border-navy-700 data-[state=checked]:bg-navy-700'}
        />
      </div>

      {/* Name + code — clickable label */}
      <label htmlFor={`pm-${m.id}`} className="mt-2.5 cursor-pointer">
        <p className={`text-xs font-extrabold leading-tight ${m.is_active ? 'text-white' : 'text-navy-950 dark:text-white'}`}>
          {m.name}
        </p>
        <p className={`mt-0.5 text-[10px] font-mono font-bold uppercase tracking-wide
          ${m.is_active ? 'text-white/50' : 'text-navy-400'}`}>
          {m.code}
        </p>
      </label>

      {/* Badge Manual Toko */}
      <div className={`mt-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide w-fit
        ${m.is_active ? 'bg-white/15 text-white/90' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
        <Building2 className="size-2.5" />
        Manual Toko
      </div>
    </div>
  )
}

// ─── MidtransChannelCard (Khusus 2. Channel Payment Gateway Otomatis) ────────
function MidtransChannelCard({
  ch, enabledChannels, onToggleChannel,
}: {
  ch: MidtransChannel
  enabledChannels: Set<string>
  onToggleChannel: (code: string, val: boolean) => void
}) {
  const isEnabled = enabledChannels.has(ch.code)

  const icon = ch.category === 'qris'
    ? <QrCode className="size-5" />
    : ch.category === 'ewallet'
    ? <Smartphone className="size-5" />
    : ch.category === 'bank_transfer'
    ? <Building2 className="size-5" />
    : <CreditCard className="size-5" />

  return (
    <div className={`flex flex-col justify-between rounded-2xl border p-3.5 transition-all ${
      isEnabled
        ? 'bg-amber-800 border-amber-600 shadow-md text-white'
        : 'border-border/70 bg-white dark:bg-surface hover:shadow-sm'
    }`}>
      {/* Top: icon + checkbox */}
      <div className="flex items-start justify-between gap-1">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
          isEnabled ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
        }`}>
          {icon}
        </div>
        <Checkbox
          id={`ch-card-${ch.code}`}
          checked={isEnabled}
          onCheckedChange={(val) => onToggleChannel(ch.code, Boolean(val))}
          className={isEnabled
            ? 'border-white data-[state=checked]:bg-white data-[state=checked]:text-navy-900'
            : 'data-[state=checked]:border-amber-600 data-[state=checked]:bg-amber-600'}
        />
      </div>

      {/* Name + code — clickable label */}
      <label htmlFor={`ch-card-${ch.code}`} className="mt-2.5 cursor-pointer">
        <p className={`text-xs font-extrabold leading-tight ${isEnabled ? 'text-white' : 'text-navy-950 dark:text-white'}`}>
          {ch.name}
        </p>
        <p className={`mt-0.5 text-[10px] font-mono font-bold uppercase tracking-wide ${
          isEnabled ? 'text-white/60' : 'text-navy-400'
        }`}>
          {ch.code}
        </p>
      </label>

      {/* Badge Via Midtrans */}
      <div className={`mt-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide w-fit ${
        isEnabled ? 'bg-white/15 text-white/90' : 'bg-amber-50 text-amber-700 border border-amber-200'
      }`}>
        <CreditCard className="size-2.5" />
        Via Midtrans
      </div>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function Index({
  envSummary,
  activeGateway: initActiveGw = 'midtrans',
  paymentMethods: initMethods = [],
  midtransChannels: initChannels = [],
  savedEnabledChannels = [],
  waliSettings: initWali,
}: IndexProps) {
  // Test states
  const [storageR, setStorageR] = useState<TestResult | null>(null)
  const [loadingStorage, setLoadingStorage] = useState(false)
  const [midtransR, setMidtransR] = useState<TestResult | null>(null)
  const [loadingMidtrans, setLoadingMidtrans] = useState(false)
  const [pakasirR, setPakasirR] = useState<TestResult | null>(null)
  const [loadingPakasir, setLoadingPakasir] = useState(false)
  const [smtpR, setSmtpR] = useState<TestResult | null>(null)
  const [loadingSmtp, setLoadingSmtp] = useState(false)
  const [dbR, setDbR] = useState<TestResult | null>(null)
  const [loadingDb, setLoadingDb] = useState(false)

  // Active Payment Gateway state
  const [activeGw, setActiveGw] = useState<string>(initActiveGw)
  const [midtransIsProd, setMidtransIsProd] = useState<boolean>(envSummary.midtransIsProduction)

  // Payment methods state
  const [methods, setMethods] = useState<PaymentMethod[]>(initMethods ?? [])
  // Midtrans channels dari API (updateable setelah test)
  const [mtChannels, setMtChannels] = useState<MidtransChannel[]>(initChannels ?? [])
  // Sub-channel enabled codes
  const [enabledChannels, setEnabledChannels] = useState<Set<string>>(
    new Set(savedEnabledChannels ?? [])
  )

  // Wali Settings state
  const [allowWaliTopup, setAllowWaliTopup] = useState(initWali?.allowWaliTopup ?? true)
  const [allowAutoTopup, setAllowAutoTopup] = useState(initWali?.allowAutoTopup ?? true)
  const [allowManualTopup, setAllowManualTopup] = useState(initWali?.allowManualTopup ?? true)
  const [manualBankName, setManualBankName] = useState(initWali?.manualBankName ?? 'BSI (Bank Syariah Indonesia)')
  const [manualBankAccountNumber, setManualBankAccountNumber] = useState(initWali?.manualBankAccountNumber ?? '7123456789')
  const [manualBankAccountName, setManualBankAccountName] = useState(initWali?.manualBankAccountName ?? 'SMK Skill Village Islamic School')

  const [saving, setSaving] = useState(false)

  // ── Generic test runner ───────────────────────────────────────────────────
  async function runTest<T extends TestResult>(
    url: string,
    setLoading: (v: boolean) => void,
    setResult: (v: T) => void,
    onSuccess?: (r: T) => void,
  ) {
    setLoading(true)
    try {
      const res = await apiPost<T>(url)
      setResult(res)
      res.success ? toast.success(res.message) : toast.error(res.message)
      if (res.success) onSuccess?.(res)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal'
      setResult({ success: false, message: msg } as T)
      toast.error(msg)
    } finally { setLoading(false) }
  }

  // ── Toggles ───────────────────────────────────────────────────────────────
  function toggleMethod(id: number, val: boolean) {
    setMethods(prev => prev.map(m => m.id === id ? { ...m, is_active: val } : m))
  }

  function toggleChannel(code: string, val: boolean) {
    setEnabledChannels(prev => {
      const next = new Set(prev)
      val ? next.add(code) : next.delete(code)
      return next
    })
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    try {
      const res = await apiPost<TestResult>(
        route('admin.integrations.update-midtrans-channels'),
        {
          active_gateway: activeGw,
          midtrans_is_production: midtransIsProd,
          methods: methods.map(m => ({
            id: m.id, is_active: m.is_active, midtrans_code: m.midtrans_code,
          })),
          enabled_channels: [...enabledChannels],
          allow_wali_topup: allowWaliTopup,
          allow_auto_topup: allowAutoTopup,
          allow_manual_topup: allowManualTopup,
          manual_bank_name: manualBankName,
          manual_bank_account_number: manualBankAccountNumber,
          manual_bank_account_name: manualBankAccountName,
        },
      )
      toast.success(res.message)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally { setSaving(false) }
  }

  const activeCount = methods.filter(m => m.is_active).length

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 pb-2">
      <PageHeader
        title="Pusat Integrasi & Uji Koneksi"
        subtitle="Kelola channel kasir, diagnosa S3 RustFS, Midtrans, Pakasir, SMTP, dan Database"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Integrasi' }]}
        actions={
          <Badge className="bg-gradient-to-r from-amber-500 to-amber-300 px-3 py-1 font-bold text-navy-950 shadow-sm">
            <ShieldCheck className="mr-1 size-3.5" /> Owner Only
          </Badge>
        }
      />

      <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6">
      {/* ── Active Gateway Provider Switcher Card ── */}
      <Card className="rounded-2xl border border-navy-800 bg-navy-950 text-white shadow-md">
        <CardHeader className="pb-3 border-b border-navy-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy-800 text-mustard-400 border border-navy-700">
                <CreditCard className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-extrabold text-white">Payment Gateway Utama (Active PG)</CardTitle>
                <CardDescription className="text-xs text-navy-200">
                  Pilih penyedia layanan Payment Gateway yang aktif untuk kasir &amp; top-up wali
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-mustard-500 text-navy-950 font-black uppercase text-[10px] px-2.5 py-1">
              Aktif: {activeGw.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveGw('midtrans')}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                activeGw === 'midtrans'
                  ? 'bg-emerald-950 border-emerald-500 ring-2 ring-emerald-500/50 shadow-md'
                  : 'bg-navy-900 border-navy-800 opacity-80 hover:opacity-100'
              }`}
            >
              <div className={`size-4 rounded-full border-2 flex items-center justify-center ${activeGw === 'midtrans' ? 'border-emerald-400 bg-emerald-500' : 'border-gray-500'}`}>
                {activeGw === 'midtrans' && <div className="size-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className="font-extrabold text-sm text-white">Midtrans Snap</p>
                <p className="text-[10px] text-navy-200">Snap Modal &amp; Dynamic QRIS/VA</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveGw('pakasir')}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                activeGw === 'pakasir'
                  ? 'bg-emerald-950 border-emerald-500 ring-2 ring-emerald-500/50 shadow-md'
                  : 'bg-navy-900 border-navy-800 opacity-80 hover:opacity-100'
              }`}
            >
              <div className={`size-4 rounded-full border-2 flex items-center justify-center ${activeGw === 'pakasir' ? 'border-emerald-400 bg-emerald-500' : 'border-gray-500'}`}>
                {activeGw === 'pakasir' && <div className="size-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className="font-extrabold text-sm text-white">Pakasir PG</p>
                <p className="text-[10px] text-navy-200">Instant QRIS &amp; Mentai Gateway</p>
              </div>
            </button>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto rounded-xl bg-mustard-500 hover:bg-mustard-400 font-extrabold text-navy-950 px-6"
          >
            <Save className={`mr-2 size-4 ${saving ? 'animate-pulse' : ''}`} />
            {saving ? 'Menyimpan...' : 'Simpan Pilihan PG'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Test Cards Grid ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TestCard
          icon={<HardDrive className="size-5 text-amber-600" />}
          title="Storage S3 (RustFS)"
          desc={`storage.santrix.my.id — Bucket: ${envSummary.s3Bucket}`}
          badge={
            <Badge className={envSummary.storageDisk === 's3' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-navy-950'}>
              Disk: {envSummary.storageDisk}
            </Badge>
          }
          meta={[['Bucket', envSummary.s3Bucket], ['Endpoint', envSummary.s3Endpoint]]}
          result={storageR} loading={loadingStorage}
          onTest={() => runTest(route('admin.integrations.test-storage'), setLoadingStorage, setStorageR)}
        />
        <div className="space-y-3">
          <TestCard
            icon={<CreditCard className="size-5 text-emerald-700" />}
            title="Midtrans Payment Gateway"
            desc="Kredensial otomatis menyesuaikan mode Sandbox/Production"
            badge={
              <Badge className={midtransIsProd ? 'bg-emerald-600 text-white' : 'bg-amber-400 text-navy-950 font-bold'}>
                {midtransIsProd ? 'Production Mode' : 'Sandbox Mode'}
              </Badge>
            }
            meta={[
              ['Mode Environment', midtransIsProd ? 'Production (Live API)' : 'Sandbox (Testing API)'],
              ['Server Key', maskKey(envSummary.midtransServerKey)],
              ['Client Key', maskKey(envSummary.midtransClientKey)],
              ['Channels', `${mtChannels.length} terdeteksi`],
            ]}
            result={midtransR} loading={loadingMidtrans}
            onTest={() => runTest(
              route('admin.integrations.test-midtrans'),
              setLoadingMidtrans, setMidtransR,
              (r) => { if (r.channels) setMtChannels(r.channels) },
            )}
          />
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-xs">
            <div className="flex items-center gap-2">
              <Checkbox
                id="midtrans-mode-toggle"
                checked={midtransIsProd}
                onCheckedChange={(v) => {
                  setMidtransIsProd(Boolean(v))
                  toast.info(Boolean(v) ? 'Mode Production dipilih (Kredensial Production dari .env digunakan)' : 'Mode Sandbox dipilih (Kredensial Sandbox dari .env digunakan)')
                }}
              />
              <label htmlFor="midtrans-mode-toggle" className="cursor-pointer font-bold text-navy-950 dark:text-white">
                Gunakan Mode Production (Uncheck untuk Sandbox)
              </label>
            </div>
            <span className="text-[10px] font-mono text-content-muted">
              Auto-Kredensial: {midtransIsProd ? 'MIDTRANS_PRODUCTION_*' : 'MIDTRANS_SANDBOX_*'}
            </span>
          </div>
        </div>
        <TestCard
          icon={<QrCode className="size-5 text-mustard-600" />}
          title="Pakasir Payment Gateway"
          desc={`Slug: ${envSummary.pakasirSlug || 'pos-mentai'}`}
          badge={<Badge className="bg-mustard-500 text-navy-950 font-bold">Pakasir Active</Badge>}
          meta={[
            ['Slug', envSummary.pakasirSlug || 'pos-mentai'],
            ['Base URL', envSummary.pakasirBaseUrl || 'https://app.pakasir.com'],
            ['Callback URL', envSummary.pakasirCallbackUrl || '/api/v1/callback/pakasir'],
          ]}
          result={pakasirR} loading={loadingPakasir}
          onTest={() => runTest(route('admin.integrations.test-pakasir'), setLoadingPakasir, setPakasirR)}
        />
        <TestCard
          icon={<Mail className="size-5 text-sky-700" />}
          title="Email Server (SMTP)"
          desc={`${envSummary.smtpHost}:${envSummary.smtpPort}`}
          badge={
            <Badge className={envSummary.smtpEnable ? 'bg-emerald-500 text-white' : 'bg-navy-200 text-navy-700'}>
              {envSummary.smtpEnable ? 'SMTP Active' : 'Log Mode'}
            </Badge>
          }
          meta={[['Host', `${envSummary.smtpHost}:${envSummary.smtpPort}`]]}
          result={smtpR} loading={loadingSmtp}
          onTest={() => runTest(route('admin.integrations.test-smtp'), setLoadingSmtp, setSmtpR)}
        />
        <TestCard
          icon={<Database className="size-5 text-purple-700" />}
          title="Database (PostgreSQL Neon)"
          desc={envSummary.dbDatabase}
          badge={<Badge className="bg-emerald-500 text-white">{envSummary.dbConnection}</Badge>}
          meta={[['Host', envSummary.dbHost], ['Database', envSummary.dbDatabase]]}
          result={dbR} loading={loadingDb}
          onTest={() => runTest(route('admin.integrations.test-db'), setLoadingDb, setDbR)}
        />
      </div>

      {/* ── 1. Metode Pembayaran Internal & Toko (Manual) ── */}
      <Card className="rounded-2xl border border-blue-200/80 bg-surface shadow-sm">
        <CardHeader className="border-b border-border/80 pb-3 bg-blue-50/40 dark:bg-blue-950/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-bold">
                <Building2 className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-extrabold text-navy-950 dark:text-white flex items-center gap-2">
                  1. Metode Pembayaran Internal &amp; Toko (Manual)
                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 font-bold">
                    Internal / Toko
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Pembayaran langsung toko: Tunai, Saldo Deposit, &amp; Transfer Bank Manual Toko.
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-emerald-600 px-4 font-bold text-white hover:bg-emerald-700"
            >
              <Save className={`mr-2 size-4 ${saving ? 'animate-pulse' : ''}`} />
              {saving ? 'Menyimpan...' : 'Simpan Semua'}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {methods
              .filter((m) => m.type === 'cash' || m.type === 'deposit' || m.type === 'transfer' || m.type === 'card' || m.type === 'credit' || m.type === 'point' || m.type === 'payroll' || m.type === 'voucher')
              .map((m) => (
                <MethodCard
                  key={m.id}
                  m={m}
                  onToggle={toggleMethod}
                />
              ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Channel Payment Gateway Otomatis (Midtrans / Pakasir) ── */}
      <Card className="rounded-2xl border border-amber-200/80 bg-surface shadow-sm">
        <CardHeader className="border-b border-border/80 pb-3 bg-amber-50/40 dark:bg-amber-950/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200 font-bold">
                <QrCode className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-extrabold text-navy-950 dark:text-white flex items-center gap-2">
                  2. Channel Payment Gateway Otomatis (Online PG)
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-bold">
                    Via Gateway ({activeGw.toUpperCase()})
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  QRIS Dinamis, E-Wallet (GoPay/ShopeePay), dan Virtual Account Bank Otomatis via Midtrans / Pakasir.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {(mtChannels.length > 0 ? mtChannels : DEFAULT_MIDTRANS_CHANNELS).map((ch) => (
              <MidtransChannelCard
                key={ch.code}
                ch={ch}
                enabledChannels={enabledChannels}
                onToggleChannel={toggleChannel}
              />
            ))}
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-[11px] text-content-muted">
            <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
            Perubahan baru berlaku setelah klik <strong>Simpan Semua</strong> dan kasir di-refresh.
          </p>
        </CardContent>
      </Card>

      {/* ── 3. Pengaturan Top-Up Portal Wali Santri ── */}
      <Card className="rounded-2xl border border-teal-200/80 bg-surface shadow-sm">
        <CardHeader className="border-b border-border/80 pb-3 bg-teal-50/40 dark:bg-teal-950/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-200 font-bold">
                <Users className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-extrabold text-navy-950 dark:text-white flex items-center gap-2">
                  3. Pengaturan Top-Up Portal Wali Santri
                  <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700 border-teal-200 font-bold">
                    Portal Wali
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Atur visibilitas fitur Top-Up &amp; opsi pembayaran yang dapat diakses oleh Wali Santri
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-teal-600 px-4 font-bold text-white hover:bg-teal-700"
            >
              <Save className={`mr-2 size-4 ${saving ? 'animate-pulse' : ''}`} />
              {saving ? 'Menyimpan...' : 'Simpan Semua'}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Main Toggle Fitur Wali TopUp */}
          <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50/60 dark:border-teal-900 dark:bg-teal-950/30 p-3.5">
            <div className="flex items-center gap-3">
              <Checkbox
                id="allow-wali-topup"
                checked={allowWaliTopup}
                onCheckedChange={(val) => setAllowWaliTopup(Boolean(val))}
              />
              <label htmlFor="allow-wali-topup" className="cursor-pointer">
                <p className="text-xs font-extrabold text-teal-950 dark:text-teal-200">
                  Aktifkan Fitur Top-Up untuk Wali Santri
                </p>
                <p className="text-[11px] text-teal-800/80 dark:text-teal-300/80">
                  Jika di-uncentang, seluruh menu &amp; pengajuan Top-Up di Portal Wali Santri akan di-hide (sembunyi).
                </p>
              </label>
            </div>
            <Badge className={allowWaliTopup ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700'}>
              {allowWaliTopup ? 'Top-Up Wali Aktif' : 'Fitur Nonaktif'}
            </Badge>
          </div>

          {/* Sub Toggles: Otomatis vs Manual */}
          {allowWaliTopup && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Opsi Otomatis Midtrans */}
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/30 dark:bg-amber-950/20 p-3.5 space-y-2">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="allow-auto-topup"
                    checked={allowAutoTopup}
                    onCheckedChange={(val) => setAllowAutoTopup(Boolean(val))}
                  />
                  <label htmlFor="allow-auto-topup" className="cursor-pointer">
                    <p className="text-xs font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <Zap className="size-3.5 text-amber-600 fill-amber-600" />
                      1. Top-Up Otomatis (Payment Gateway)
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Wali Santri dapat membayar instan via QRIS, E-Wallet &amp; VA Bank (mengikuti centangan Midtrans).
                    </p>
                  </label>
                </div>
              </div>

              {/* Opsi Transfer Manual */}
              <div className="rounded-xl border border-blue-200/80 bg-blue-50/30 dark:bg-blue-950/20 p-3.5 space-y-2">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="allow-manual-topup"
                    checked={allowManualTopup}
                    onCheckedChange={(val) => setAllowManualTopup(Boolean(val))}
                  />
                  <label htmlFor="allow-manual-topup" className="cursor-pointer">
                    <p className="text-xs font-extrabold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-blue-600" />
                      2. Transfer Manual + Upload Bukti
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Wali Santri transfer manual ke rekening bank sekolah &amp; mengunggah foto bukti transfer.
                    </p>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Form Rekening Bank Sekolah jika Manual Aktif */}
          {allowWaliTopup && allowManualTopup && (
            <div className="rounded-xl border border-border bg-slate-50/50 dark:bg-surface-alt p-4 space-y-3">
              <h4 className="text-xs font-bold text-navy-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Building2 className="size-4 text-blue-600" />
                Informasi Rekening Bank Sekolah (Tujuan Transfer Manual)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <Label className="text-[11px] font-bold text-content-muted">Nama Bank</Label>
                  <Input
                    value={manualBankName}
                    onChange={(e) => setManualBankName(e.target.value)}
                    placeholder="Contoh: BSI (Bank Syariah Indonesia)"
                    className="h-9 mt-1 font-bold text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-content-muted">Nomor Rekening</Label>
                  <Input
                    value={manualBankAccountNumber}
                    onChange={(e) => setManualBankAccountNumber(e.target.value)}
                    placeholder="Contoh: 7123456789"
                    className="h-9 mt-1 font-mono font-bold text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-content-muted">Atas Nama Rekening</Label>
                  <Input
                    value={manualBankAccountName}
                    onChange={(e) => setManualBankAccountName(e.target.value)}
                    placeholder="Contoh: SMK Skill Village Islamic School"
                    className="h-9 mt-1 font-bold text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-content-muted">
            <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
            Pengaturan visibilitas ini langsung memicu perubahan tampilan di Portal Wali Santri.
          </p>
        </CardContent>
      </Card>
      </form>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
