import { useState, type ReactElement } from 'react'
import {
  CheckCircle2, XCircle, RefreshCw, HardDrive, CreditCard,
  Mail, Database, ShieldCheck, Save, Banknote,
  Wallet, Ticket, Star, ClipboardList, Clock, QrCode,
  Smartphone, Building2,
} from 'lucide-react'
import AdminLayout from '@/Layouts/AdminLayout'
import { PageHeader } from '@/Components/common/PageHeader'
import { Button } from '@/Components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card'
import { Badge } from '@/Components/ui/badge'
import { Checkbox } from '@/Components/ui/checkbox'
import { apiPost } from '@/Lib/api'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

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

// Midtrans category mapping
const MT_CATEGORY: Record<string, string> = {
  qris:     'qris',
  ewallet:  'ewallet',
  transfer: 'bank_transfer',
}

// ─── MethodCard ───────────────────────────────────────────────────────────────
function MethodCard({
  m, onToggle, subChannels = [], enabledChannels, onToggleChannel,
}: {
  m: PaymentMethod
  onToggle: (id: number, val: boolean) => void
  subChannels?: MidtransChannel[]
  enabledChannels: Set<string>
  onToggleChannel: (code: string, val: boolean) => void
}) {
  const cfg = TYPE_CONFIG[m.type] ?? FALLBACK_CONFIG!
  const hasSub = subChannels.length > 0

  return (
    // h-[200px] agar semua 10 card SAMA tingginya
    <div className={`flex h-[200px] flex-col rounded-2xl border p-3.5 transition-all
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
        <p className={`text-xs font-extrabold leading-tight ${m.is_active ? 'text-white' : 'text-navy-950'}`}>
          {m.name}
        </p>
        <p className={`mt-0.5 text-[10px] font-mono font-bold uppercase tracking-wide
          ${m.is_active ? 'text-white/50' : 'text-navy-400'}`}>
          {m.code}
        </p>
      </label>

      {/* Sub-channels: grid 3 kolom agar rapi tanpa scrollbar */}
      {hasSub && (
        <div className={`mt-2 flex-1 border-t pt-2
          ${m.is_active ? 'border-white/10' : 'border-border/50'}`}>
          <div className="grid grid-cols-3 gap-1">
            {subChannels.map(ch => {
              const shortName = ch.name
                .replace(' Virtual Account', ' VA')
                .replace(' CIMB Niaga', ' CIMB')
                .replace('QRIS (GoPay, OVO, ShopeePay, Dana, LinkAja)', 'QRIS')
              const isEnabled = enabledChannels.has(ch.code)
              return (
                <label
                  key={ch.code}
                  htmlFor={`ch-${ch.code}`}
                  className={`flex cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 transition-colors
                    ${m.is_active
                      ? isEnabled ? 'bg-white/20' : 'hover:bg-white/10'
                      : isEnabled ? 'bg-navy-50' : 'hover:bg-navy-50/60'
                    }`}
                >
                  <Checkbox
                    id={`ch-${ch.code}`}
                    checked={isEnabled}
                    onCheckedChange={(val) => onToggleChannel(ch.code, Boolean(val))}
                    className={`size-3 shrink-0 ${m.is_active
                      ? 'border-white/50 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-navy-900'
                      : 'data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600'
                    }`}
                  />
                  <span className={`truncate text-[9px] font-semibold leading-none
                    ${m.is_active ? 'text-white/90' : 'text-navy-800'}`}>
                    {shortName}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      )}
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
    <div className="flex flex-col gap-5 pb-10">
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

      {/* ── Metode Pembayaran Kasir ── */}
      <Card className="rounded-2xl border border-border/90 bg-surface shadow-sm">
        <CardHeader className="border-b border-border/80 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-extrabold text-navy-950 dark:text-white">
                Metode Pembayaran Kasir POS
              </CardTitle>
              <CardDescription className="text-xs">
                Centang metode &amp; sub-channel yang tampil di kasir — semua tersimpan ke database
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-content-muted">{activeCount}/{methods.length} aktif</span>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-4 font-bold text-white hover:bg-emerald-700"
              >
                <Save className={`mr-2 size-4 ${saving ? 'animate-pulse' : ''}`} />
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5">
          {/* Grid 5 kolom, h-[200px] fixed per card = semua sama tinggi */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {methods.map(m => {
              const cat = MT_CATEGORY[m.type]
              const subChannels = cat ? mtChannels.filter(ch => ch.category === cat) : []
              return (
                <MethodCard
                  key={m.id}
                  m={m}
                  onToggle={toggleMethod}
                  subChannels={subChannels}
                  enabledChannels={enabledChannels}
                  onToggleChannel={toggleChannel}
                />
              )
            })}
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-[11px] text-content-muted">
            <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
            Checkbox atas = aktif/nonaktif di kasir. Checkbox bawah = sub-channel Midtrans yang diizinkan saat proses bayar.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

Index.layout = (page: ReactElement) => <AdminLayout>{page}</AdminLayout>
