/**
 * T-106. Ekstraksi token XSRF + fetch() manual sebelumnya di-copy-paste
 * 4× (Opnames/Show.tsx, SaleReturns/Create.tsx, Reports/Show.tsx,
 * NotificationBell.tsx) — kelas bug yang sudah 2× menggigit proyek ini
 * (CSRF meta tag Fase 11, crypto.randomUUID Fase 16, lihat Lib/idempotency.ts).
 * Dipusatkan di sini supaya perbaikan berikutnya cukup satu tempat.
 */
function getCsrfToken(): string {
  const metaToken = typeof document !== 'undefined' ? document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') : null
  if (metaToken) return metaToken
  return typeof document !== 'undefined' ? decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '') : ''
}

type JsonInit = Omit<RequestInit, 'body' | 'headers'> & { headers?: Record<string, string> }

async function request<T>(method: string, url: string, body?: unknown, init?: JsonInit): Promise<T> {
  const token = getCsrfToken()
  const res = await fetch(url, {
    ...init,
    method,
    headers: {
      Accept: 'application/json',
      'X-CSRF-TOKEN': token,
      'X-XSRF-TOKEN': token,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // Beberapa route (mis. aksi 2FA) dijaga middleware `password.confirm`
  // Laravel — untuk request yang expectsJson() (kita selalu kirim
  // Accept: application/json), middleware itu TIDAK redirect, tapi
  // balas 423 Locked + pesan JSON polos (lihat
  // Illuminate\Auth\Middleware\RequirePassword::handle()). Alih-alih
  // error 423 yang membingungkan, arahkan ke halaman konfirmasi
  // password — setelah user konfirmasi, mereka perlu mengulang aksi
  // tadi (Fortify tidak resume otomatis, ini bukan bug).
  if (res.status === 423) {
    window.location.href = route('password.confirm')
    return new Promise<T>(() => {}) // navigasi sedang berjalan, jangan resolve
  }

  // redirect ke halaman HTML biasa (mis. sesi habis) — fetch() otomatis
  // MENGIKUTI redirect itu (res.ok tetap true), lalu res.json() akan
  // gagal parse HTML sebagai JSON — alih-alih error membingungkan,
  // navigasi penuh ke halaman itu.
  if (res.redirected && !res.url.includes('/api/')) {
    window.location.href = res.url
    return new Promise<T>(() => {}) // navigasi sedang berjalan, jangan resolve
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new ApiError(res.status, data)
  }

  if (res.status === 204) return undefined as T

  return res.json()
}

export class ApiError extends Error {
  constructor(public status: number, public data: { message?: string; errors?: Record<string, string[]> } | null) {
    super(data?.message ?? `Request gagal (${status})`)
  }

  firstError(): string {
    if (this.data?.errors) {
      const first = Object.values(this.data.errors)[0]
      if (first?.[0]) return first[0]
    }

    return this.message
  }
}

export const apiGet = <T,>(url: string, init?: JsonInit) => request<T>('GET', url, undefined, init)
export const apiPost = <T,>(url: string, body?: unknown, init?: JsonInit) => request<T>('POST', url, body, init)
export const apiPut = <T,>(url: string, body?: unknown, init?: JsonInit) => request<T>('PUT', url, body, init)
export const apiDelete = <T,>(url: string, init?: JsonInit) => request<T>('DELETE', url, undefined, init)
