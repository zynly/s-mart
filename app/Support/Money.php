<?php

namespace App\Support;

class Money
{
    public static function format(int $amount): string
    {
        $sign = $amount < 0 ? '-' : '';

        return $sign.'Rp '.number_format(abs($amount), 0, ',', '.');
    }

    public static function formatShort(int $amount): string
    {
        $sign = $amount < 0 ? '-' : '';
        $abs = abs($amount);

        if ($abs >= 1_000_000_000) {
            return $sign.'Rp '.self::trimZero($abs / 1_000_000_000).'M';
        }

        if ($abs >= 1_000_000) {
            return $sign.'Rp '.self::trimZero($abs / 1_000_000).'jt';
        }

        if ($abs >= 1_000) {
            return $sign.'Rp '.self::trimZero($abs / 1_000).'rb';
        }

        return self::format($amount);
    }

    public static function parse(string $input): int
    {
        $clean = preg_replace('/[^0-9\-]/', '', $input);

        return (int) $clean;
    }

    public static function round(int $amount, int $step = 100): int
    {
        if ($step <= 0) {
            return $amount;
        }

        return (int) (round($amount / $step) * $step);
    }

    public static function roundUp(int $amount, int $step = 100): int
    {
        if ($step <= 0) {
            return $amount;
        }

        return (int) (ceil($amount / $step) * $step);
    }

    public static function roundDown(int $amount, int $step = 100): int
    {
        if ($step <= 0) {
            return $amount;
        }

        return (int) (floor($amount / $step) * $step);
    }

    public static function terbilang(int $amount): string
    {
        $rupiah = self::spell(abs($amount));
        $prefix = $amount < 0 ? 'minus ' : '';

        return trim($prefix.$rupiah.' rupiah');
    }

    private static function trimZero(float $value): string
    {
        return rtrim(rtrim(number_format($value, 1, ',', ''), '0'), ',');
    }

    private static function spell(int $number): string
    {
        $satuan = [
            '', 'satu', 'dua', 'tiga', 'empat', 'lima',
            'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh',
            'sebelas',
        ];

        if ($number < 12) {
            return $satuan[$number];
        }

        if ($number < 20) {
            return self::spell($number - 10).' belas';
        }

        if ($number < 100) {
            $sisa = $number % 10;

            return trim(self::spell(intdiv($number, 10)).' puluh '.($sisa > 0 ? self::spell($sisa) : ''));
        }

        if ($number < 200) {
            return trim('seratus '.($number - 100 > 0 ? self::spell($number - 100) : ''));
        }

        if ($number < 1000) {
            $sisa = $number % 100;

            return trim(self::spell(intdiv($number, 100)).' ratus '.($sisa > 0 ? self::spell($sisa) : ''));
        }

        if ($number < 2000) {
            $sisa = $number % 1000;

            return trim('seribu '.($sisa > 0 ? self::spell($sisa) : ''));
        }

        if ($number < 1_000_000) {
            $sisa = $number % 1000;

            return trim(self::spell(intdiv($number, 1000)).' ribu '.($sisa > 0 ? self::spell($sisa) : ''));
        }

        if ($number < 1_000_000_000) {
            $sisa = $number % 1_000_000;

            return trim(self::spell(intdiv($number, 1_000_000)).' juta '.($sisa > 0 ? self::spell($sisa) : ''));
        }

        $sisa = $number % 1_000_000_000;

        return trim(self::spell(intdiv($number, 1_000_000_000)).' miliar '.($sisa > 0 ? self::spell($sisa) : ''));
    }
}
