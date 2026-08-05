// REVISI-R1-v2.md §8.1 — "indikator kekuatan" untuk field password
// baru (Ganti Password wali + Lupa Password). Heuristik sederhana di
// klien murni untuk UMPAN BALIK VISUAL — validasi kekuatan sesungguhnya
// tetap di server (Password::default(), lihat Laravel policy).
function scorePassword(password: string): number {
  if (password.length === 0) return 0

  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1

  return Math.min(score, 4)
}

const LABELS = ['Sangat Lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat Kuat']
const COLORS = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-success', 'bg-success']

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (password.length === 0) return null

  const score = scorePassword(password)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < score ? COLORS[score] : 'bg-border'}`} />
        ))}
      </div>
      <p className="text-xs text-content-muted">{LABELS[score]}</p>
    </div>
  )
}
