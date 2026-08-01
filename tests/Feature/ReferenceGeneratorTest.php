<?php

use App\Support\ReferenceGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('generates sequential references under the test connection', function () {
    $refs = [];
    for ($i = 0; $i < 3; $i++) {
        $refs[] = ReferenceGenerator::generate('TMP', 1);
    }

    expect($refs[0])->toEndWith('-0001')
        ->and($refs[1])->toEndWith('-0002')
        ->and($refs[2])->toEndWith('-0003');
});
