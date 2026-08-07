<div class="member-card">
    {{-- Top Navy & Gold Header Ribbon --}}
    <div class="card-header-ribbon">
        <table class="card-header-table">
            <tr>
                <td style="width: 65%;">
                    <table style="border-collapse: collapse;">
                        <tr>
                            <td style="padding: 0; padding-right: 1.5mm;">
                                <div class="header-logo-box">
                                    @php $logoPath = public_path('logo/logo2.png'); @endphp
                                    @if(file_exists($logoPath))
                                        <img src="{{ $logoPath }}" class="header-logo-img" alt="Logo">
                                    @else
                                        <span style="font-size: 5pt; font-weight: bold; color: #1e3a8a;">SM</span>
                                    @endif
                                </div>
                            </td>
                            <td style="padding: 0;">
                                <div class="header-title-main">SKILL VILLAGE</div>
                                <div class="header-title-sub">ISLAMIC BOARDING SCHOOL</div>
                            </td>
                        </tr>
                    </table>
                </td>
                <td style="width: 35%; text-align: right;">
                    <span class="header-badge" style="background-color: #fcd34d; color: #1e3a8a;">OFFICIAL SCANNER</span>
                </td>
            </tr>
        </table>
    </div>

    {{-- Main Content Back Body --}}
    <div class="card-back-main">
        <div class="back-qr-box">
            @if(isset($barcode) && $barcode)
                <img src="data:image/png;base64,{{ $barcode }}" style="height: 10mm; max-width: 40mm;" alt="barcode">
            @endif
        </div>
        <div class="back-member-name">{{ strtoupper($member->name) }}</div>
        <div class="back-member-nis">NIS / KARTU: {{ $member->nis ?? $card->card_number }} — PRESENSI &amp; POS SCANNER</div>
    </div>

    <div class="back-disclaimer">
        Kartu ini adalah identitas resmi santri Skill Village.<br>
        Jika menemukan harap mengembalikan ke pengelola pesantren.
    </div>

    {{-- Footer Ribbon --}}
    <div class="card-footer-ribbon">
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="font-weight: bold; color: #fcd34d;">SKILL VILLAGE OFFICIAL CARD</td>
                <td style="text-align: right; color: #ffffff;">IDENTITAS RESMI SANTRI</td>
            </tr>
        </table>
    </div>
</div>
