<?php

namespace App\Services;

use App\Models\Member;
use Barryvdh\DomPDF\Facade\Pdf;
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
        $generator = new BarcodeGeneratorPNG;

        $cards = $members
            ->map(function (Member $member) use ($generator) {
                $card = $member->cards()->where('status', 'active')->first();

                if ($card === null) {
                    return null;
                }

                $card->increment('print_count');

                return [
                    'member' => $member,
                    'card' => $card,
                    'barcode' => base64_encode(
                        $generator->getBarcode($card->card_number, BarcodeGeneratorPNG::TYPE_CODE_128, 2, 60)
                    ),
                ];
            })
            ->filter()
            ->values();

        return Pdf::loadView('pdf.member-cards', ['cards' => $cards])
            ->setPaper('a4', 'portrait')
            ->output();
    }
}
