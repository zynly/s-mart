<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    @include('pdf.partials.member-card-style')
    <style>
        @page { margin: 0; size: 100mm 70mm; }
        body { font-family: Helvetica, Arial, sans-serif; margin: 8mm; }
    </style>
</head>
<body>
    @include('pdf.partials.member-card-item', ['member' => $member, 'card' => $card, 'barcode' => $barcode])
</body>
</html>
