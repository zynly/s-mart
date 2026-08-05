<?php

namespace App\Services;

use App\Models\Member;
use App\Models\MemberCard;
use Barryvdh\DomPDF\Facade\Pdf;
use DomainException;
use Illuminate\Support\Collection;
use Picqer\Barcode\BarcodeGeneratorPNG;

class CardPrintService
{
    /**
     * Cetak kartu massal: A4 portrait, 2 kolom x 4 baris = 8 kartu/halaman.
     *
     * @param  Collection<int, Member>  $members
     */
    public function printCards(Collection $members): string
    {
        $cards = $members
            ->map(fn (Member $member) => $this->buildCardItem($member))
            ->filter()
            ->values();

        return Pdf::loadView('pdf.member-cards', ['cards' => $cards])
            ->setPaper('a4', 'portrait')
            ->output();
    }

    /**
     * REVISI-R1-v2.md §9.3 — pratinjau SATU kartu sebelum cetak massal,
     * supaya kesalahan data/desain ketahuan sebelum menghabiskan kertas.
     * TIDAK menambah `print_count` (bukan cetak sungguhan).
     */
    public function previewCard(Member $member): string
    {
        $card = $member->cards()->where('status', 'active')->first();

        if ($card === null) {
            throw new DomainException("Anggota \"{$member->name}\" tidak punya kartu aktif untuk dipratinjau.");
        }

        return Pdf::loadView('pdf.member-card-preview', [
            'member' => $member,
            'card' => $card,
            'barcode' => $this->generateBarcode($card),
        ])->output();
    }

    /**
     * @return array{member: Member, card: MemberCard, barcode: string}|null
     */
    private function buildCardItem(Member $member): ?array
    {
        $card = $member->cards()->where('status', 'active')->first();

        if ($card === null) {
            return null;
        }

        $card->increment('print_count');

        return [
            'member' => $member,
            'card' => $card,
            'barcode' => $this->generateBarcode($card),
        ];
    }

    private function generateBarcode(MemberCard $card): string
    {
        $generator = new BarcodeGeneratorPNG;

        return base64_encode(
            $generator->getBarcode($card->card_number, BarcodeGeneratorPNG::TYPE_CODE_128, 2, 60)
        );
    }
}
