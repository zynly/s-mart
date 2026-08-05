<?php

namespace Database\Seeders;

use App\Models\Account;
use Illuminate\Database\Seeder;

class AccountSeeder extends Seeder
{
    /**
     * Chart of Account wajib (PROMPT-POS-SKILLAGE-MART.md §Fase 13.2)
     * + 3 akun tambahan di luar daftar literal spec (didokumentasikan
     * di docs/tickets/INDEX.md §Fase 13 — Temuan E):
     *   - 1-1450 Piutang Karyawan (Payroll)
     *   - 4-1300 Pendapatan Komisi Konsinyasi (peta jurnal konsinyasi
     *     hasil koreksi CATATAN-PERBAIKAN.md, bukan "Beban Konsinyasi"
     *     di spec asli yang salah — lihat SaleObserver)
     *   - 6-1600 Beban Penyesuaian Saldo
     *
     * Format baris: [code, name, type, normal_balance, parent_code].
     * level & parent_id dihitung dari rantai parent_code saat seeding,
     * bukan ditulis manual (mencegah salah hitung).
     */
    private const ACCOUNTS = [
        // ASET
        ['1-0000', 'ASET', 'asset', 'debit', null],
        ['1-1000', 'Aset Lancar', 'asset', 'debit', '1-0000'],
        ['1-1100', 'Kas', 'asset', 'debit', '1-1000'],
        ['1-1101', 'Kas Laci Kasir', 'asset', 'debit', '1-1100'],
        ['1-1102', 'Kas Brankas', 'asset', 'debit', '1-1100'],
        ['1-1200', 'Bank', 'asset', 'debit', '1-1000'],
        ['1-1201', 'Bank — Rekening Utama', 'asset', 'debit', '1-1200'],
        ['1-1300', 'E-Wallet & QRIS', 'asset', 'debit', '1-1000'],
        ['1-1400', 'Piutang Usaha', 'asset', 'debit', '1-1000'],
        ['1-1450', 'Piutang Karyawan (Payroll)', 'asset', 'debit', '1-1000'],
        ['1-1500', 'Piutang Anggota', 'asset', 'debit', '1-1000'],
        ['1-1600', 'Persediaan Barang Dagang', 'asset', 'debit', '1-1000'],
        ['1-1700', 'Perlengkapan', 'asset', 'debit', '1-1000'],

        // KEWAJIBAN
        ['2-0000', 'KEWAJIBAN', 'liability', 'credit', null],
        ['2-1000', 'Kewajiban Lancar', 'liability', 'credit', '2-0000'],
        ['2-1100', 'Utang Usaha', 'liability', 'credit', '2-1000'],
        ['2-1200', 'Utang Deposit Anggota', 'liability', 'credit', '2-1000'],
        ['2-1300', 'Utang Konsinyasi', 'liability', 'credit', '2-1000'],
        ['2-1400', 'Utang Pajak', 'liability', 'credit', '2-1000'],

        // EKUITAS
        ['3-0000', 'EKUITAS', 'equity', 'credit', null],
        ['3-1000', 'Modal', 'equity', 'credit', '3-0000'],
        ['3-2000', 'Laba Ditahan', 'equity', 'credit', '3-0000'],
        ['3-3000', 'Ikhtisar Laba Rugi', 'equity', 'credit', '3-0000'],

        // PENDAPATAN
        ['4-0000', 'PENDAPATAN', 'revenue', 'credit', null],
        ['4-1000', 'Penjualan', 'revenue', 'credit', '4-0000'],
        ['4-1100', 'Retur Penjualan', 'revenue', 'debit', '4-0000'],
        ['4-1200', 'Diskon Penjualan', 'revenue', 'debit', '4-0000'],
        ['4-1300', 'Pendapatan Komisi Konsinyasi', 'revenue', 'credit', '4-0000'],
        ['4-2000', 'Pendapatan Lain-lain', 'revenue', 'credit', '4-0000'],
        ['4-2100', 'Selisih Kas Lebih', 'revenue', 'credit', '4-2000'],
        ['4-2200', 'Selisih Pembulatan', 'revenue', 'credit', '4-2000'],
        // 4-2300 (bukan di daftar literal spec, ditemukan saat implementasi
        // Fase 13 §Temuan L): "4-2000 Pendapatan Lain-lain" ternyata akun
        // header (punya 4-2100/4-2200) sehingga tidak bisa diposting
        // langsung — dibutuhkan satu leaf generik untuk kasus "pendapatan
        // lain-lain" yang bukan selisih kas/pembulatan: voucher hangus
        // (SaleReturnObserver, refund target=forfeited) & penyesuaian
        // saldo deposit turun (DepositTransactionObserver, type=adjustment).
        ['4-2300', 'Pendapatan Operasional Lainnya', 'revenue', 'credit', '4-2000'],

        // HARGA POKOK PENJUALAN
        ['5-0000', 'HARGA POKOK PENJUALAN', 'expense', 'debit', null],
        ['5-1000', 'HPP', 'expense', 'debit', '5-0000'],

        // BEBAN
        ['6-0000', 'BEBAN', 'expense', 'debit', null],
        ['6-1000', 'Beban Operasional', 'expense', 'debit', '6-0000'],
        ['6-1100', 'Beban Kerugian Persediaan', 'expense', 'debit', '6-1000'],
        ['6-1200', 'Beban Piutang Tak Tertagih', 'expense', 'debit', '6-1000'],
        ['6-1300', 'Beban MDR', 'expense', 'debit', '6-1000'],
        ['6-1400', 'Beban Promosi', 'expense', 'debit', '6-1000'],
        ['6-1500', 'Selisih Kas Kurang', 'expense', 'debit', '6-1000'],
        ['6-1600', 'Beban Penyesuaian Saldo', 'expense', 'debit', '6-1000'],
        // 6-1700..6-1900 (bukan di daftar literal spec, ditemukan saat
        // memetakan cash_categories.account_code, Fase 13 §Temuan L): kas
        // keluar manual lewat CashController butuh akun leaf per kategori
        // (Gaji/Belanja Ops/Lain-lain) — "6-1000 Beban Operasional" sendiri
        // header, tidak bisa diposting langsung.
        ['6-1700', 'Beban Gaji/Honor', 'expense', 'debit', '6-1000'],
        ['6-1800', 'Beban Operasional Lainnya', 'expense', 'debit', '6-1000'],
        ['6-1900', 'Beban Lain-lain', 'expense', 'debit', '6-1000'],
        ['6-2000', 'Beban Konsinyasi', 'expense', 'debit', '6-0000'],
    ];

    public function run(): void
    {
        /** @var array<string, Account> $byCode */
        $byCode = [];

        foreach (self::ACCOUNTS as [$code, $name, $type, $normalBalance, $parentCode]) {
            $parent = $parentCode !== null ? ($byCode[$parentCode] ?? null) : null;
            $level = $parent !== null ? $parent->level + 1 : 1;

            $byCode[$code] = Account::updateOrCreate(
                ['code' => $code],
                [
                    'name' => $name,
                    'type' => $type,
                    'normal_balance' => $normalBalance,
                    'parent_id' => $parent?->id,
                    'level' => $level,
                    'is_system' => true,
                    'is_active' => true,
                ],
            );
        }

        // Audit Fase 7 (Temuan Rendah): JournalService::getProfitLoss()
        // sebelumnya mendeteksi baris HPP dengan hardcode literal
        // `$row->code === '5-1000'` — akun HPP baru (mis. dipecah per
        // kategori produk) akan diam-diam TIDAK terhitung. `subtype`
        // sudah ada di skema & form Account sejak awal tapi tidak pernah
        // dipakai — sekarang jadi penanda generik "ini akun HPP",
        // getProfitLoss() membaca subtype ini, bukan kode literal.
        $byCode['5-1000']->update(['subtype' => 'cogs']);
    }
}
