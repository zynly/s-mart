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
                    <span class="header-badge">OFFICIAL CARD</span>
                </td>
            </tr>
        </table>
    </div>

    {{-- Main Content Body --}}
    <table class="card-body-table">
        <tr>
            <td style="width: 22mm;">
                <div class="photo-container">
                    <div class="photo-inner">
                        @php
                            $photoPath = $member->photo ? storage_path('app/public/'.$member->photo) : null;
                        @endphp
                        @if ($photoPath && file_exists($photoPath))
                            <img src="{{ $photoPath }}" alt="Foto">
                        @else
                            <span>FOTO</span>
                        @endif
                    </div>
                </div>
            </td>
            <td>
                <div class="info-container">
                    <div>
                        <span class="info-header-title">KARTU SANTRI</span>
                        <span class="status-badge-active">AKTIF</span>
                    </div>

                    <table class="info-details-table">
                        <tr>
                            <td class="info-key">Nama</td>
                            <td class="info-colon">:</td>
                            <td class="info-val-name">{{ strtoupper($member->name) }}</td>
                        </tr>
                        <tr>
                            <td class="info-key">NIS / NIK</td>
                            <td class="info-colon">:</td>
                            <td class="info-val">{{ $member->nis ?? $card->card_number }}</td>
                        </tr>
                        <tr>
                            <td class="info-key">Kelas/Tipe</td>
                            <td class="info-colon">:</td>
                            <td class="info-val-highlight">{{ $member->class_name ?? ($member->type_label ?? 'SANTRI') }}</td>
                        </tr>
                    </table>

                    <div class="motto-banner">
                        "Berilmu, Beramal &amp; Berakhlaqul Karimah"
                    </div>
                </div>
            </td>
        </tr>
    </table>

    {{-- Barcode Box --}}
    <div class="card-barcode-box">
        <img src="data:image/png;base64,{{ $barcode }}" alt="barcode">
        <div class="barcode-subtext">{{ $card->card_number }}</div>
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
