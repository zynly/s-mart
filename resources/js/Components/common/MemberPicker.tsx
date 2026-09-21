import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/Components/ui/input'
import { Button } from '@/Components/ui/button'
import { Badge } from '@/Components/ui/badge'
import { Money } from '@/Components/common/Money'

type MemberOption = {
  id: number
  name: string
  member_number: string
  nis: string | null
  balance_cache: number
}

interface MemberPickerProps {
  members: MemberOption[]
  /** ID anggota yang sedang dipilih (string kosong = belum pilih) */
  value: string
  onChange: (id: string) => void
  /** Tampilkan kolom saldo (default: true) */
  showBalance?: boolean
  /** Label tombol aksi di kolom Aksi (default: "Pilih") */
  actionLabel?: string
}

const PER_PAGE = 6

/**
 * MemberPicker — pengganti <Select> untuk memilih anggota dari daftar besar.
 *
 * Fitur:
 * - Search real-time (nama / NIS / no. anggota)
 * - Tabel paginated (6 per halaman)
 * - Tampil saldo anggota saat ini
 * - State "sudah dipilih" dengan tombol ganti
 */
export function MemberPicker({
  members,
  value,
  onChange,
  showBalance = true,
  actionLabel = 'Pilih',
}: MemberPickerProps) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const selectedMember = members.find((m) => String(m.id) === value) ?? null

  const filtered = useMemo(() => {
    if (!search.trim()) return members
    const q = search.toLowerCase()
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.member_number.includes(q) ||
        (m.nis ?? '').includes(q),
    )
  }, [members, search])

  const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page],
  )

  function handleSearch(q: string) {
    setSearch(q)
    setPage(1)
  }

  // Tampilkan state "sudah dipilih" — kompak, ada tombol Ganti
  if (selectedMember) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-bg p-3">
        <div>
          <p className="font-semibold text-sm text-content">{selectedMember.name}</p>
          <p className="text-xs font-mono text-content-muted">{selectedMember.member_number}</p>
        </div>
        {showBalance && (
          <div className="text-right">
            <p className="text-[11px] text-content-muted">Saldo</p>
            <Money amount={selectedMember.balance_cache} size="sm" />
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-3 h-7 text-xs"
          onClick={() => {
            onChange('')
            setSearch('')
            setPage(1)
          }}
        >
          Ganti
        </Button>
      </div>
    )
  }

  // Tampilkan picker: search + tabel + pagination
  return (
    <div className="flex flex-col gap-2">
      {/* Search box */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-content-muted pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Cari nama / NIS / no. anggota…"
          className="pl-8 h-9 text-sm"
          autoFocus
        />
      </div>

      {/* Tabel anggota */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-900 text-white text-[11px] uppercase font-bold tracking-wider">
              <tr>
                <th className="px-3 py-2 font-bold">No. Anggota</th>
                <th className="px-3 py-2 font-bold">Nama</th>
                {showBalance && <th className="px-3 py-2 text-right font-bold">Saldo</th>}
                <th className="px-3 py-2 text-center font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.map((m) => (
                <tr
                  key={m.id}
                  className="hover:bg-navy-50/50 transition-colors cursor-pointer"
                  onClick={() => onChange(String(m.id))}
                >
                  <td className="px-3 py-2.5 font-mono text-navy-800 font-medium">
                    {m.member_number}
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-content">{m.name}</td>
                  {showBalance && (
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">
                      <Money amount={m.balance_cache} size="sm" />
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-center">
                    <Button
                      type="button"
                      size="sm"
                      className="h-6 px-2.5 text-[11px] bg-navy-800 text-white hover:bg-navy-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        onChange(String(m.id))
                      }}
                    >
                      {actionLabel}
                    </Button>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td
                    colSpan={showBalance ? 4 : 3}
                    className="p-4 text-center text-content-muted"
                  >
                    Tidak ada anggota ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: info + pagination */}
        <div className="flex items-center justify-between border-t border-border bg-surface px-3 py-2 text-xs text-content-muted">
          <span>
            {filtered.length > 0
              ? `${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, filtered.length)} dari `
              : ''}
            <span className="font-mono font-bold text-content">{filtered.length}</span> anggota
            {search && (
              <Badge variant="outline" className="ml-2 text-[10px]">
                filter aktif
              </Badge>
            )}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ◀
            </Button>
            <span className="px-2 font-mono font-semibold text-content">
              {page}/{totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              ▶
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
