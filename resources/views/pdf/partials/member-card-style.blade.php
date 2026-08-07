<style>
    @page {
        margin: 0;
    }

    body {
        font-family: Helvetica, Arial, sans-serif;
        margin: 0;
        padding: 0;
        background-color: #ffffff;
    }

    .member-card {
        width: 85.6mm;
        height: 54mm;
        position: relative;
        background-color: #fdfbf7;
        border: 0.4mm solid #d97706;
        border-radius: 3mm;
        overflow: hidden;
        box-sizing: border-box;
    }

    /* Top Navy & Gold Header Ribbon */
    .card-header-ribbon {
        width: 100%;
        height: 8.5mm;
        background-color: #1e3a8a;
        border-bottom: 0.6mm solid #f59e0b;
        color: #ffffff;
    }

    .card-header-table {
        width: 100%;
        height: 8.5mm;
        border-collapse: collapse;
    }

    .card-header-table td {
        vertical-align: middle;
        padding: 0 2mm;
    }

    .header-logo-img {
        height: 5.5mm;
        vertical-align: middle;
    }

    .header-logo-box {
        display: inline-block;
        background-color: #ffffff;
        border-radius: 1mm;
        padding: 0.5mm 1mm;
        vertical-align: middle;
    }

    .header-title-main {
        font-size: 6.5pt;
        font-weight: bold;
        color: #ffffff;
        letter-spacing: 0.4pt;
        line-height: 1;
        text-transform: uppercase;
    }

    .header-title-sub {
        font-size: 4.5pt;
        font-weight: bold;
        color: #fcd34d;
        letter-spacing: 0.3pt;
        line-height: 1;
        text-transform: uppercase;
        margin-top: 0.3mm;
    }

    .header-badge {
        background-color: #f59e0b;
        color: #1e3a8a;
        font-size: 5pt;
        font-weight: bold;
        padding: 0.8mm 2mm;
        border-radius: 2mm;
        text-transform: uppercase;
        letter-spacing: 0.4pt;
        text-align: right;
    }

    /* Main Content Body */
    .card-body-table {
        width: 100%;
        margin-top: 1.5mm;
        border-collapse: collapse;
    }

    .card-body-table td {
        vertical-align: top;
    }

    /* Photo Styling */
    .photo-container {
        width: 19mm;
        height: 25mm;
        background-color: #f59e0b;
        padding: 0.5mm;
        border-radius: 2mm;
        margin-left: 2.5mm;
    }

    .photo-inner {
        width: 18mm;
        height: 24mm;
        background-color: #ffffff;
        border: 0.3mm solid #1e3a8a;
        border-radius: 1.5mm;
        overflow: hidden;
        text-align: center;
        line-height: 24mm;
        font-size: 6pt;
        color: #1e3a8a;
        font-weight: bold;
    }

    .photo-inner img {
        width: 18mm;
        height: 24mm;
        object-fit: cover;
    }

    /* Info Table Styling */
    .info-container {
        padding-left: 2.5mm;
        padding-right: 2.5mm;
    }

    .info-header-title {
        font-size: 7.5pt;
        font-weight: bold;
        color: #1e3a8a;
        text-transform: uppercase;
        letter-spacing: 0.3pt;
    }

    .status-badge-active {
        display: inline-block;
        font-size: 4.5pt;
        font-weight: bold;
        color: #15803d;
        background-color: #dcfce7;
        border: 0.2mm solid #86efac;
        padding: 0.2mm 1mm;
        border-radius: 1mm;
        margin-left: 1mm;
        vertical-align: middle;
    }

    .info-details-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 1mm;
    }

    .info-details-table td {
        font-size: 5.5pt;
        padding: 0.3mm 0;
        vertical-align: middle;
    }

    .info-key {
        font-weight: bold;
        color: #1e3a8a;
        width: 14mm;
    }

    .info-colon {
        font-weight: bold;
        color: #1e3a8a;
        width: 2mm;
    }

    .info-val {
        font-weight: bold;
        color: #0f172a;
    }

    .info-val-name {
        font-weight: bold;
        color: #1e3a8a;
        font-size: 6pt;
        text-transform: uppercase;
    }

    .info-val-highlight {
        font-weight: bold;
        color: #b45309;
    }

    /* Motto / Slogan Banner */
    .motto-banner {
        margin-top: 1mm;
        background-color: #fef3c7;
        border: 0.2mm solid #f59e0b;
        border-radius: 1.5mm;
        padding: 0.5mm 1.5mm;
        text-align: center;
        font-size: 4.5pt;
        font-style: italic;
        font-weight: bold;
        color: #1e3a8a;
    }

    /* Barcode & Footer Positioning */
    .card-footer-ribbon {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 3.5mm;
        background-color: #1e3a8a;
        border-top: 0.4mm solid #f59e0b;
        color: #ffffff;
        font-size: 4.5pt;
        font-weight: bold;
        line-height: 3.5mm;
        padding: 0 3mm;
    }

    .card-barcode-box {
        position: absolute;
        right: 2.5mm;
        bottom: 4.5mm;
        text-align: center;
        background-color: #ffffff;
        border: 0.2mm solid #e2e8f0;
        padding: 0.5mm 1mm;
        border-radius: 1mm;
    }

    .card-barcode-box img {
        height: 6mm;
        max-width: 28mm;
    }

    .barcode-subtext {
        font-family: Courier, monospace;
        font-size: 4.5pt;
        font-weight: bold;
        color: #1e3a8a;
        margin-top: 0.2mm;
    }

    /* Back Side Specific */
    .card-back-main {
        padding: 2.5mm 3mm;
        text-align: center;
    }

    .back-qr-box {
        display: inline-block;
        padding: 1mm;
        background-color: #ffffff;
        border: 0.4mm solid #f59e0b;
        border-radius: 2mm;
        margin-top: 1mm;
    }

    .back-member-name {
        font-size: 7.5pt;
        font-weight: bold;
        color: #1e3a8a;
        text-transform: uppercase;
        margin-top: 1mm;
    }

    .back-member-nis {
        font-size: 5.5pt;
        font-weight: bold;
        color: #475569;
        margin-top: 0.3mm;
    }

    .back-disclaimer {
        position: absolute;
        bottom: 4mm;
        left: 3mm;
        right: 3mm;
        font-size: 4.5pt;
        color: #64748b;
        text-align: center;
        line-height: 1.3;
    }
</style>
