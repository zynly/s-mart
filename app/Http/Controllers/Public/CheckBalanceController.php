<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Member;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CheckBalanceController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Public/CheckBalance');
    }

    public function check(Request $request): Response
    {
        // Audit Fase 6 (Temuan Tinggi): member_number berformat sekuensial
        // dapat ditebak sepenuhnya (tahun+nomor urut) — sebelumnya nomor
        // ITU SAJA sudah cukup membuka saldo persis, dibatasi cuma
        // throttle per-IP yang longgar (10/menit) untuk ruang ID yang
        // kecil. Sekarang wajib faktor kedua (tanggal lahir) yang tidak
        // bisa ditebak dari nomor anggota — wali/santri pasti tahu,
        // penyerang acak tidak. Throttle juga diperketat (lihat routes/web.php).
        $data = $request->validate([
            'member_number' => ['required', 'string', 'max:30'],
            'birth_date' => ['required', 'date'],
        ]);

        $member = Member::where('member_number', $data['member_number'])
            ->whereDate('birth_date', $data['birth_date'])
            ->where('status', 'active')
            ->first();

        // Respons SAMA (generik) untuk "nomor tidak ditemukan", "member
        // ada tapi status tidak aktif", DAN "tanggal lahir tidak cocok" —
        // kalau dibedakan, endpoint ini jadi alat enumerasi (baik status
        // keanggotaan maupun tanggal lahir orang lain).
        if ($member === null) {
            return Inertia::render('Public/CheckBalance', [
                'error' => 'Nomor anggota atau tanggal lahir tidak cocok.',
                'submittedNumber' => $data['member_number'],
            ]);
        }

        return Inertia::render('Public/CheckBalance', [
            'result' => [
                'name' => $this->maskName($member->name),
                'balance' => $member->balance_cache,
            ],
            'submittedNumber' => $data['member_number'],
        ]);
    }

    /**
     * Nama santri TIDAK ditampilkan penuh — endpoint ini publik tanpa
     * login, nomor anggota bisa dicoba-coba (walau di-throttle). Kata
     * pertama utuh (konfirmasi "ini kartu saya") + sisanya disamarkan,
     * bukan nama lengkap yang bisa dipanen lewat percobaan berurutan.
     */
    private function maskName(string $name): string
    {
        $words = explode(' ', trim($name));
        $first = array_shift($words);
        $masked = array_map(fn ($w) => mb_substr($w, 0, 1).str_repeat('*', max(1, mb_strlen($w) - 1)), $words);

        return trim($first.' '.implode(' ', $masked));
    }
}
