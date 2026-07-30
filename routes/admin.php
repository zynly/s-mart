<?php

use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::prefix('admin')->name('admin.')->middleware(['auth'])->group(function () {
    Route::get('/', fn () => Inertia::render('Admin/Dashboard'))->name('dashboard');

    Route::middleware('can:user.view')->group(function () {
        Route::get('/users', [UserController::class, 'index'])->name('users.index');
    });
    Route::post('/users', [UserController::class, 'store'])->name('users.store')->middleware('can:user.create');
    Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update')->middleware('can:user.update');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy')->middleware('can:user.delete');
    Route::put('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password')->middleware('can:user.update');
    Route::put('/users/{user}/pin', [UserController::class, 'setPin'])->name('users.set-pin')->middleware('can:user.update');

    Route::middleware('can:role.view')->group(function () {
        Route::get('/roles', [RoleController::class, 'index'])->name('roles.index');
    });
    Route::post('/roles', [RoleController::class, 'store'])->name('roles.store')->middleware('can:role.create');
    Route::put('/roles/{role}', [RoleController::class, 'update'])->name('roles.update')->middleware('can:role.update');

    Route::get('/activity-logs', [ActivityLogController::class, 'index'])
        ->name('activity-logs.index');
});
