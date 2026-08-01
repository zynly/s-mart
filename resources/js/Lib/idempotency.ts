/**
 * Bug nyata ditemukan Fase 16: `crypto.randomUUID()` butuh secure
 * context (HTTPS atau localhost) — di `http://s-mart.test` (domain
 * dev Laragon biasa, bukan HTTPS/localhost) method ini TIDAK ADA sama
 * sekali di `window.crypto`, melempar TypeError yang menggagalkan
 * SELURUH submit (bukan cuma kehilangan idempotency). Sebelumnya
 * dipakai terpisah di Deposit/Pos/SaleReturns tanpa fallback — satu
 * fungsi di sini dipakai ulang semua tempat.
 */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}
