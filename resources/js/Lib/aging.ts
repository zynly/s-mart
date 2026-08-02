/**
 * T-088 (Phase D). Label bucket umur piutang/hutang — sebelumnya
 * disalin identik di Debts/Index.tsx & Receivables/Index.tsx. Ambang
 * hari (current/0-30/31-60/61-90/90+) dihitung server-side lewat
 * app/Support/AgingBucket.php — kalau berubah di sana, sinkronkan
 * urutan/label di sini juga (bahasa beda, tidak bisa impor lintas
 * PHP<->TS).
 */
export const AGING_BUCKETS = ['current', '0-30', '31-60', '61-90', '90+'] as const

export type AgingBucketKey = (typeof AGING_BUCKETS)[number]

export const AGING_BUCKET_LABELS: Record<AgingBucketKey, string> = {
  current: 'Belum Jatuh Tempo',
  '0-30': '0–30 Hari',
  '31-60': '31–60 Hari',
  '61-90': '61–90 Hari',
  '90+': '> 90 Hari',
}
