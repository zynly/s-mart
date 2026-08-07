<?php

namespace App\Http\Controllers\Wali;

use App\Http\Controllers\Controller;
use App\Models\DepositTransaction;
use App\Models\Guardian;
use App\Models\Member;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use App\Notifications\AlertNotification;
use App\Services\CardService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class MemberController extends Controller
{
    private const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

    public function index(Request $request): Response
    {
        $guardian = $request->user('guardian');

        $members = $guardian->members()
            ->where('status', 'active')
            ->get(['members.id', 'members.name', 'members.member_number', 'members.class_name', 'members.balance_cache', 'members.photo']);

        return Inertia::render('Wali/Members/Index', [
            'members' => $members->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->name,
                'member_number' => $m->member_number,
                'class_name' => $m->class_name,
                'balance_cache' => (int) $m->balance_cache,
                'photo' => $m->photo,
            ]),
        ]);
    }

    public function show(Request $request, Member $member): Response
    {
        $guardian = $request->user('guardian');

        $this->assertOwnsChild($guardian, $member);

        $allMembers = $guardian->members()
            ->where('status', 'active')
            ->get(['members.id', 'members.name', 'members.class_name']);

        $sales = Sale::where('member_id', $member->id)
            ->where('status', 'completed')
            ->latest('sale_date')
            ->limit(10)
            ->get(['id', 'reference', 'sale_date', 'grand_total'])
            ->map(fn ($s) => ['type' => 'belanja', 'reference' => $s->reference, 'date' => $s->sale_date->toIso8601String(), 'amount' => -$s->grand_total]);

        $topups = DepositTransaction::where('member_id', $member->id)
            ->where('type', 'topup')
            ->latest()
            ->limit(10)
            ->get(['id', 'reference', 'created_at', 'amount'])
            ->map(fn ($t) => ['type' => 'topup', 'reference' => $t->reference, 'date' => $t->created_at->toIso8601String(), 'amount' => $t->amount]);

        $riwayat = $sales->concat($topups)->sortByDesc('date')->values()->take(15);

        $card = $member->activeCard;

        return Inertia::render('Wali/Members/Show', [
            'member' => [
                'id' => $member->id,
                'name' => $member->name,
                'member_number' => $member->member_number,
                'class_name' => $member->class_name,
                'balance_cache' => $member->balance_cache,
                'photo' => $member->photo,
            ],
            'allMembers' => $allMembers->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->name,
                'class_name' => $m->class_name,
            ]),
            'riwayat' => $riwayat,
            'weeklyChart' => $this->weeklyChart($member),
            'favoriteProducts' => $this->favoriteProducts($member),
            // fase-16-v2.md §10 — jangan tampilkan nomor kartu lengkap,
            // hanya 4 digit/karakter me-masked_number.
            'card' => $card ? [
                'status' => $card->status,
                'masked_number' => 'XXXX'.substr($card->card_number, -4),
                'last_used_at' => $card->last_used_at?->toIso8601String(),
            ] : null,
        ]);
    }

    /**
     * fase-16-v2.md §5 "Laporkan Kartu Hilang" — kartu dinonaktifkan
     * (status 'lost'), saldo TIDAK hilang (tetap di balance_cache),
     * admin diberi tahu lewat lonceng in-app supaya bisa menghubungi
     * wali untuk proses kartu pengganti (CardService::reissue()).
     */
    public function reportLostCard(Request $request, Member $member): RedirectResponse
    {
        $guardian = $request->user('guardian');

        $this->assertOwnsChild($guardian, $member);

        $card = $member->activeCard;

        if ($card === null) {
            return back()->with('error', 'Tidak ada kartu aktif untuk dilaporkan.');
        }

        app(CardService::class)->reportLost($card);

        $admins = User::permission('member.update')->where('is_active', true)->get();

        foreach ($admins as $admin) {
            $admin->notify(new AlertNotification(
                'Kartu Member Dilaporkan Hilang',
                "{$member->name} ({$member->member_number}) melaporkan kartu hilang lewat Portal Wali.",
                route('admin.members.index'),
                'card-lost-'.$card->id.'-'.Str::random(6),
            ));
        }

        return back()->with('success', 'Kartu berhasil dilaporkan hilang. Admin akan menghubungi Anda untuk proses kartu pengganti. Saldo tidak hilang.');
    }

    private function assertOwnsChild(Guardian $guardian, Member $member): void
    {
        if (! $guardian->members()->where('members.id', $member->id)->exists()) {
            throw new NotFoundHttpException;
        }
    }

    /**
     * @return array<int, array{date: string, label: string, total: int}>
     */
    private function weeklyChart(Member $member): array
    {
        $start = now()->subDays(6)->startOfDay();

        $totals = Sale::where('member_id', $member->id)
            ->where('status', 'completed')
            ->where('sale_date', '>=', $start)
            ->selectRaw('DATE(sale_date) as day, SUM(grand_total) as total')
            ->groupBy('day')
            ->pluck('total', 'day');

        return collect(range(0, 6))->map(function (int $i) use ($start, $totals) {
            $date = $start->copy()->addDays($i);
            $key = $date->toDateString();

            return [
                'date' => $key,
                // Konvensi ISO (1=Senin..7=Minggu) sesuai README-v2.md,
                // bukan Carbon::dayOfWeek (0=Minggu) supaya urutan label
                // selalu Sen..Min.
                'label' => self::DAY_LABELS[$date->dayOfWeekIso - 1],
                'total' => (int) ($totals[$key] ?? 0),
            ];
        })->all();
    }

    /**
     * @return array<int, array{name: string, frequency: int, emoji: string}>
     */
    private function favoriteProducts(Member $member): array
    {
        return SaleItem::query()
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->where('sales.member_id', $member->id)
            ->where('sales.status', 'completed')
            ->where('sales.sale_date', '>=', now()->startOfMonth())
            ->selectRaw('products.id, products.name, COUNT(*) as frequency')
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('frequency')
            ->limit(5)
            ->get()
            ->map(fn ($row) => [
                'name' => $row->name,
                'frequency' => (int) $row->frequency,
                'emoji' => $this->guessEmoji($row->name),
            ])
            ->all();
    }

    private function guessEmoji(string $productName): string
    {
        $name = mb_strtolower($productName);

        return match (true) {
            str_contains($name, 'roti'), str_contains($name, 'bakery') => '🍞',
            str_contains($name, 'mie'), str_contains($name, 'noodle') => '🍜',
            str_contains($name, 'susu'), str_contains($name, 'teh'), str_contains($name, 'kopi'), str_contains($name, 'jus'), str_contains($name, 'minuman') => '🥤',
            str_contains($name, 'air'), str_contains($name, 'aqua') => '💧',
            str_contains($name, 'coklat'), str_contains($name, 'cokelat'), str_contains($name, 'permen'), str_contains($name, 'candy') => '🍬',
            str_contains($name, 'keripik'), str_contains($name, 'chip'), str_contains($name, 'snack') => '🍪',
            str_contains($name, 'nasi'), str_contains($name, 'rice') => '🍚',
            default => '🛍',
        };
    }
}
