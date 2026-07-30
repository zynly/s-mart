<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('Public/Welcome'));
Route::get('/uji-komponen', fn () => Inertia::render('UjiKomponen'));
