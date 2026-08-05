<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAccountRequest;
use App\Http\Requests\Admin\UpdateAccountRequest;
use App\Models\Account;
use App\Services\JournalService;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    public function __construct(private readonly JournalService $journalService) {}

    public function index(): Response
    {
        return Inertia::render('Admin/Accounts/Index', [
            'tab' => 'accounts',
            'accounts' => Account::orderBy('code')->get(),
        ]);
    }

    public function store(StoreAccountRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $parent = $data['parent_id'] !== null ? Account::findOrFail($data['parent_id']) : null;

        Account::create([
            ...$data,
            'level' => $parent !== null ? $parent->level + 1 : 1,
            'is_system' => false,
            'is_active' => true,
        ]);

        return back()->with('success', 'Akun berhasil dibuat.');
    }

    public function update(UpdateAccountRequest $request, Account $account): RedirectResponse
    {
        $data = $request->validated();

        // Audit Fase 4 (Temuan Kritis #5): menonaktifkan akun yang masih
        // punya saldo berjalan sebelumnya diizinkan bebas — saldo itu
        // lalu diam-diam hilang dari Neraca/Trial Balance (leafAccounts()
        // memfilter is_active). Sekarang diblokir tegas; akun harus
        // disaldo-nolkan (lewat proses akuntansi yang benar) dulu sebelum
        // bisa dinonaktifkan. Tidak berlaku utk MENGAKTIFKAN kembali.
        if (($data['is_active'] ?? true) === false && $account->is_active && $this->journalService->hasNonZeroBalance($account)) {
            throw ValidationException::withMessages(['is_active' => 'Akun ini masih punya saldo berjalan — tidak bisa dinonaktifkan sampai saldonya nol.']);
        }

        $account->update($data);

        return back()->with('success', 'Akun berhasil diperbarui.');
    }

    public function destroy(Account $account): RedirectResponse
    {
        if ($account->is_system) {
            throw ValidationException::withMessages(['account' => 'Akun bawaan sistem tidak bisa dihapus.']);
        }

        if (! $account->isLeaf()) {
            throw ValidationException::withMessages(['account' => 'Akun ini punya akun anak — hapus atau pindahkan akun anaknya dulu.']);
        }

        if ($account->entries()->exists()) {
            throw ValidationException::withMessages(['account' => 'Akun ini sudah punya mutasi jurnal — tidak bisa dihapus.']);
        }

        try {
            $account->delete();
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['account' => $e->getMessage()]);
        }

        return back()->with('success', 'Akun berhasil dihapus.');
    }
}
