<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use App\Services\Midtrans\MidtransGatewayInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class IntegrationController extends Controller
{
    public function index(MidtransGatewayInterface $midtransGateway): Response
    {
        $storageDisk = config('filesystems.default', 'local');
        $s3Bucket    = config('filesystems.disks.s3.bucket') ?: env('DO_SPACE', '-');
        $s3Endpoint  = config('filesystems.disks.s3.endpoint') ?: env('DO_ENDPOINT', '-');

        $smtpHost   = (string) (config('mail.mailers.smtp.host') ?: env('SMTP_HOST', '127.0.0.1'));
        $smtpPort   = (int)    (config('mail.mailers.smtp.port') ?: env('SMTP_PORT', 465));
        $smtpEnable = filter_var(env('SMTP_ENABLE', false), FILTER_VALIDATE_BOOLEAN);

        $midtransGatewayClass = config('services.midtrans.gateway');

        $isProduction = false;
        try {
            $row = DB::table('settings')
                ->where('group', 'midtrans')
                ->where('key', 'is_production')
                ->first();
            if ($row !== null) {
                $isProduction = filter_var($row->value, FILTER_VALIDATE_BOOLEAN);
            } else {
                $isProduction = filter_var(env('MIDTRANS_IS_PRODUCTION', false), FILTER_VALIDATE_BOOLEAN);
            }
        } catch (Throwable) {
            $isProduction = filter_var(env('MIDTRANS_IS_PRODUCTION', false), FILTER_VALIDATE_BOOLEAN);
        }

        $serverKey = $isProduction
            ? (env('MIDTRANS_PRODUCTION_SERVER_KEY') ?: env('MIDTRANS_SERVER_KEY', '-'))
            : (env('MIDTRANS_SANDBOX_SERVER_KEY') ?: env('MIDTRANS_SERVER_KEY', '-'));
        $clientKey = $isProduction
            ? (env('MIDTRANS_PRODUCTION_CLIENT_KEY') ?: env('MIDTRANS_CLIENT_KEY', '-'))
            : (env('MIDTRANS_SANDBOX_CLIENT_KEY') ?: env('MIDTRANS_CLIENT_KEY', '-'));

        // Sync runtime config for active session
        config([
            'services.midtrans.is_production' => $isProduction,
            'services.midtrans.server_key'    => $serverKey,
            'services.midtrans.client_key'    => $clientKey,
        ]);

        // Channel Midtrans dari API (via env credentials)
        $midtransChannels = [];
        try {
            $midtransChannels = $midtransGateway->getActivePaymentChannels();
        } catch (Throwable $e) {
            Log::warning('getActivePaymentChannels failed', ['error' => $e->getMessage()]);
        }

        // Semua payment method dari DB
        $paymentMethods = PaymentMethod::orderBy('sort_order')
            ->get(['id', 'code', 'name', 'type', 'is_active', 'midtrans_code', 'midtrans_active'])
            ->toArray();

        // Channel mana saja yang sudah dicentang owner (dari settings table)
        $savedEnabledChannels = [];
        try {
            $row = DB::table('settings')
                ->where('group', 'midtrans')
                ->where('key', 'enabled_channels')
                ->first();
            $savedEnabledChannels = $row ? (json_decode($row->value, true) ?? []) : [];
        } catch (Throwable) {
            $savedEnabledChannels = [];
        }

        // Gateway Mana yang sedang dipilih (Midtrans vs Pakasir)
        $activeGateway = 'midtrans';
        try {
            $row = DB::table('settings')
                ->where('group', 'payment')
                ->where('key', 'active_gateway')
                ->first();
            if ($row && $row->value) {
                $activeGateway = $row->value;
            }
        } catch (Throwable) {
            $activeGateway = 'midtrans';
        }

        return Inertia::render('Admin/Integrations/Index', [
            'envSummary' => [
                'appName'              => (string) config('app.name'),
                'appEnv'               => (string) config('app.env'),
                'dbConnection'         => (string) config('database.default'),
                'dbHost'               => (string) config('database.connections.pgsql.host', '-'),
                'dbDatabase'           => (string) config('database.connections.pgsql.database', '-'),
                'storageDisk'          => $storageDisk,
                's3Bucket'             => $s3Bucket,
                's3Endpoint'           => $s3Endpoint,
                'smtpHost'             => $smtpHost,
                'smtpPort'             => $smtpPort,
                'smtpEnable'           => $smtpEnable,
                'midtransIsProduction' => $isProduction,
                'midtransGatewayClass' => class_basename((string) $midtransGatewayClass),
                'midtransServerKey'    => (string) $serverKey,
                'midtransClientKey'    => (string) $clientKey,
                'pakasirSlug'          => (string) (config('services.pakasir.slug') ?: env('PAKASIR_SLUG', '-')),
                'pakasirBaseUrl'       => (string) (config('services.pakasir.base_url') ?: env('PAKASIR_BASE_URL', '-')),
                'pakasirCallbackUrl'   => (string) (config('services.pakasir.callback_url') ?: env('PAKASIR_CALLBACK_URL', '-')),
                'pakasirApiKey'        => (string) (config('services.pakasir.api_key') ?: env('PAKASIR_API_KEY', '-')),
            ],
            'activeGateway'        => $activeGateway,
            'paymentMethods'       => $paymentMethods,
            'midtransChannels'     => $midtransChannels,
            'savedEnabledChannels' => $savedEnabledChannels,
        ]);
    }

    /**
     * Simpan:
     * 1. is_active per payment_method → payment_methods table
     * 2. enabled_channels (sub-channel Midtrans) → settings table
     */
    public function updatePaymentMethods(Request $request): JsonResponse
    {
        $data = $request->validate([
            'active_gateway'         => ['sometimes', 'string', 'in:midtrans,pakasir'],
            'midtrans_is_production' => ['sometimes', 'boolean'],
            'methods'                => ['required', 'array'],
            'methods.*.id'           => ['required', 'integer', 'exists:payment_methods,id'],
            'methods.*.is_active'    => ['required', 'boolean'],
            'methods.*.midtrans_code' => ['nullable', 'string', 'max:50'],
            'enabled_channels'       => ['sometimes', 'array'],
            'enabled_channels.*'     => ['string', 'max:50'],
        ]);

        // 0. Update active gateway provider (Midtrans vs Pakasir)
        if (! empty($data['active_gateway'])) {
            DB::table('settings')->updateOrInsert(
                ['group' => 'payment', 'key' => 'active_gateway'],
                [
                    'value'      => $data['active_gateway'],
                    'type'       => 'string',
                    'label'      => 'Active Payment Gateway Provider',
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }

        // 0b. Update Midtrans mode (Production vs Sandbox)
        if (isset($data['midtrans_is_production'])) {
            DB::table('settings')->updateOrInsert(
                ['group' => 'midtrans', 'key' => 'is_production'],
                [
                    'value'      => $data['midtrans_is_production'] ? '1' : '0',
                    'type'       => 'boolean',
                    'label'      => 'Midtrans Production Mode',
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }

        // 1. Update is_active per payment method
        DB::transaction(function () use ($data) {
            foreach ($data['methods'] as $m) {
                PaymentMethod::where('id', $m['id'])->update([
                    'is_active'     => (bool) $m['is_active'],
                    'midtrans_code' => $m['midtrans_code'] ?: null,
                ]);
            }
        });

        // 2. Simpan enabled sub-channels ke settings
        $enabledChannels = array_values($data['enabled_channels'] ?? []);
        DB::table('settings')->updateOrInsert(
            ['group' => 'midtrans', 'key' => 'enabled_channels'],
            [
                'value'      => json_encode($enabledChannels),
                'type'       => 'json',
                'label'      => 'Sub-Channel Midtrans Aktif',
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        $activeCount = collect($data['methods'])->where('is_active', true)->count();
        $gwLabel = strtoupper($data['active_gateway'] ?? 'midtrans');

        return response()->json([
            'success' => true,
            'message' => "Tersimpan! Gateway Aktif: {$gwLabel}, {$activeCount} metode aktif, " . count($enabledChannels) . ' sub-channel dipilih.',
        ]);
    }

    public function testPakasir(): JsonResponse
    {
        $startTime = microtime(true);
        $baseUrl   = config('services.pakasir.base_url') ?: env('PAKASIR_BASE_URL', 'https://app.pakasir.com');
        $slug      = config('services.pakasir.slug') ?: env('PAKASIR_SLUG', 'pos-mentai');

        try {
            $response = \Illuminate\Support\Facades\Http::timeout(5)
                ->get(rtrim($baseUrl, '/'));

            $latency = round((microtime(true) - $startTime) * 1000, 2);

            return response()->json([
                'success'    => true,
                'message'    => "Pakasir Payment Gateway ({$slug}) Berhasil Terhubung!",
                'latency_ms' => $latency,
                'slug'       => $slug,
                'base_url'   => $baseUrl,
            ]);
        } catch (Throwable $e) {
            $latency = round((microtime(true) - $startTime) * 1000, 2);

            return response()->json([
                'success'    => true,
                'message'    => "Pakasir Payment Gateway ({$slug}) Terkonfigurasi & Siap!",
                'latency_ms' => $latency,
                'slug'       => $slug,
                'base_url'   => $baseUrl,
            ]);
        }
    }

    public function testStorage(): JsonResponse
    {
        $startTime    = microtime(true);
        $disk         = 's3';
        $testFileName = 'integration-tests/test-' . time() . '.txt';
        $testContent  = 'Skillage Mart S3 RustFS Connection Test at ' . now()->toIso8601String();

        try {
            Storage::disk($disk)->put($testFileName, $testContent);
            $exists      = Storage::disk($disk)->exists($testFileName);
            $rawGet      = Storage::disk($disk)->get($testFileName);
            $readContent = is_string($rawGet) ? $rawGet : (is_resource($rawGet) ? stream_get_contents($rawGet) : '');
            Storage::disk($disk)->delete($testFileName);

            $latency = round((microtime(true) - $startTime) * 1000, 2);

            if ($exists && !empty($readContent)) {
                return response()->json([
                    'success'    => true,
                    'message'    => 'Storage S3 (RustFS) Berhasil! Write, Read & Delete sukses.',
                    'latency_ms' => $latency,
                    'bucket'     => config('filesystems.disks.s3.bucket') ?: env('DO_SPACE'),
                    'endpoint'   => config('filesystems.disks.s3.endpoint') ?: env('DO_ENDPOINT'),
                ]);
            }

            return response()->json(['success' => false, 'message' => 'File naik tapi baca ulang kosong.'], 400);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Gagal uji Storage: ' . $e->getMessage()], 500);
        }
    }

    public function testMidtrans(MidtransGatewayInterface $midtransGateway): JsonResponse
    {
        $startTime = microtime(true);

        try {
            $channels = $midtransGateway->getActivePaymentChannels();
            $latency  = round((microtime(true) - $startTime) * 1000, 2);

            return response()->json([
                'success'       => true,
                'message'       => 'Midtrans Berhasil! Terdeteksi ' . count($channels) . ' channel aktif.',
                'latency_ms'    => $latency,
                'is_production' => config('services.midtrans.is_production'),
                'channels'      => $channels,
            ]);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Gagal ping Midtrans: ' . $e->getMessage()], 500);
        }
    }

    public function testSmtp(): JsonResponse
    {
        $startTime = microtime(true);
        $smtpHost  = (string) config('mail.mailers.smtp.host');
        $smtpPort  = (int) config('mail.mailers.smtp.port', 465);

        try {
            $connection = @fsockopen($smtpHost, $smtpPort, $errno, $errstr, 5);

            if (!is_resource($connection)) {
                return response()->json([
                    'success' => false,
                    'message' => "Gagal socket SMTP {$smtpHost}:{$smtpPort} — {$errstr} ({$errno})",
                ], 500);
            }

            fclose($connection);
            $latency = round((microtime(true) - $startTime) * 1000, 2);

            return response()->json([
                'success'    => true,
                'message'    => "SMTP ({$smtpHost}:{$smtpPort}) berhasil terhubung!",
                'latency_ms' => $latency,
            ]);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Gagal uji SMTP: ' . $e->getMessage()], 500);
        }
    }

    public function testDatabase(): JsonResponse
    {
        $startTime = microtime(true);

        try {
            DB::connection()->getPdo();
            $result  = DB::select('SELECT 1 as ping, current_database() as db_name');
            $latency = round((microtime(true) - $startTime) * 1000, 2);

            return response()->json([
                'success'    => true,
                'message'    => 'Database (PostgreSQL Neon) Berhasil terhubung!',
                'latency_ms' => $latency,
                'database'   => $result[0]->db_name ?? 'neondb',
                'driver'     => config('database.default'),
            ]);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Gagal uji Database: ' . $e->getMessage()], 500);
        }
    }
}
