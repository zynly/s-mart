<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    // T-105: seed SEKALI per proses migrate:fresh (bukan per test) —
    // RefreshDatabase men-jalankan db:seed hanya saat migrasi ulang
    // pertama kali, lalu tiap test dibungkus transaksi+rollback yang
    // mempertahankan baseline seed itu. Memanggil $this->seed() manual
    // di beforeEach() tiap file (percobaan awal) menjalankan ULANG
    // seluruh 8 seeder (termasuk hashing bcrypt UserSeeder) di SETIAP
    // test — satu file 2 test jadi >6 menit. Dengan properti ini,
    // seed penuh cuma sekali per keseluruhan test run.
    protected $seed = true;
}
