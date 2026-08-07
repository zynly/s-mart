<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FetchOpenFoodFactsImages extends Command
{
    protected $signature = 'products:fetch-off-images {--force : Overwrite existing images}';

    protected $description = 'Fetch product photos from Open Food Facts API and attach them to products in the database.';

    private const KEYWORD_MAP = [
        'Chiki Balls 60g' => ['chiki', 'chips', 'snack'],
        'Chitato 68g' => ['chitato', 'chips'],
        'Taro Net 65g' => ['taro', 'chips'],
        'Oreo Original 137g' => ['oreo', 'biscuit'],
        'Roma Kelapa 300g' => ['roma kelapa', 'biscuit'],
        'Air Mineral 600ml' => ['mineral water', 'water'],
        'Teh Pucuk Harum 350ml' => ['teh pucuk', 'tea'],
        'Pocari Sweat 350ml' => ['pocari sweat', 'pocari'],
        'Susu UHT Coklat 250ml' => ['milk', 'chocolate milk'],
        'Kopi Kapal Api Sachet' => ['coffee', 'kopi'],
        'Beras Premium 5kg' => ['rice', 'basmati'],
        'Minyak Goreng 1L' => ['cooking oil', 'oil'],
        'Gula Pasir 1kg' => ['sugar', 'white sugar'],
        'Telur Ayam 1kg' => ['eggs', 'egg'],
        'Mie Instan Goreng' => ['indomie', 'instant noodle'],
        'Buku Tulis 38 Lembar' => ['notebook', 'paper'],
        'Pulpen Standard AE7' => ['pen', 'ballpoint'],
        'Pensil 2B Faber-Castell' => ['faber castell', 'pencil'],
        'Penghapus Karet' => ['eraser'],
        'Penggaris 30cm' => ['ruler'],
        'Sabun Mandi Batang' => ['soap', 'bar soap'],
        'Sikat Gigi' => ['toothbrush'],
        'Pasta Gigi 75g' => ['toothpaste', 'pepsodent'],
        'Sampo Sachet' => ['shampoo'],
        'Handuk Kecil' => ['towel'],
        'Paracetamol Tablet' => ['paracetamol'],
        'Tolak Angin Sachet' => ['herbal tea', 'herbal'],
        'Betadine 15ml' => ['betadine', 'antiseptic'],
        'Plester Luka' => ['bandage', 'plaster'],
        'Masker Medis 1pcs' => ['mask', 'face mask'],
    ];

    public function handle(): int
    {
        $products = Product::all();
        $this->info("Found {$products->count()} products. Fetching images from Open Food Facts API...");

        $successCount = 0;
        $skipCount = 0;
        $failCount = 0;

        foreach ($products as $product) {
            $hasPrimaryImage = $product->images()->where('is_primary', true)->exists();
            if ($hasPrimaryImage && ! $this->option('force')) {
                $this->line("Skipping {$product->name} (already has primary image)");
                $skipCount++;
                continue;
            }

            $imageUrl = $this->searchOpenFoodFactsImage($product);

                if (! $imageUrl) {
                    $this->line("Attempting local/fallback image for {$product->name}...");
                    $this->createFallbackProductImage($product);
                    $successCount++;
                    continue;
                }


            try {
                $imageContent = Http::timeout(15)
                    ->withHeaders(['User-Agent' => 'SkillageMartApp/1.0 (contact@skillagemart.test)'])
                    ->get($imageUrl)
                    ->body();

                if (empty($imageContent)) {
                    $this->error("Failed to download image content for {$product->name}");
                    $failCount++;
                    continue;
                }

                $extension = pathinfo(parse_url($imageUrl, PHP_URL_PATH), PATHINFO_EXTENSION) ?: 'jpg';
                $filename = "product_{$product->id}_" . Str::slug($product->name) . ".{$extension}";
                $path = "products/{$filename}";

                Storage::disk('public')->put($path, $imageContent);

                if ($this->option('force')) {
                    $product->images()->update(['is_primary' => false]);
                }

                ProductImage::create([
                    'product_id' => $product->id,
                    'path' => $path,
                    'alt' => $product->name,
                    'sort_order' => 1,
                    'is_primary' => true,
                ]);

                $this->info("✓ Saved image for [{$product->name}] -> storage/app/public/{$path}");
                $successCount++;
            } catch (\Exception $e) {
                $this->error("Error saving image for {$product->name}: " . $e->getMessage());
                $failCount++;
            }
        }

        $this->info("\nCompleted! Success: {$successCount}, Skipped: {$skipCount}, Failed: {$failCount}");

        return Command::SUCCESS;
    }

    private function searchOpenFoodFactsImage(Product $product): ?string
    {
        $keywords = self::KEYWORD_MAP[$product->name] ?? [
            Str::before($product->name, ' '),
            $product->name
        ];

        foreach ($keywords as $keyword) {
            $this->line("Searching OFF for keyword: '{$keyword}' (product: {$product->name})...");

            try {
                $response = Http::timeout(2)
                    ->withHeaders(['User-Agent' => 'SkillageMartApp/1.0 (contact@skillagemart.test)'])
                    ->get('https://world.openfoodfacts.org/cgi/search.pl', [
                        'search_terms' => $keyword,
                        'search_simple' => 1,
                        'action' => 'process',
                        'json' => 1,
                        'page_size' => 5,
                    ]);

                if ($response->successful()) {
                    $data = $response->json();
                    if (! empty($data['products'])) {
                        foreach ($data['products'] as $item) {
                            $img = $item['image_front_url']
                                ?? $item['image_url']
                                ?? $item['image_front_small_url']
                                ?? null;

                            if ($img) {
                                return $img;
                            }
                        }
                    }
                }
            } catch (\Exception $e) {
                $this->warn("OFF API search unavailable for '{$keyword}': " . $e->getMessage());
            }
        }

        return null;
    }

    private function createFallbackProductImage(Product $product): void
    {
        $filename = "product_{$product->id}_" . Str::slug($product->name) . ".svg";
        $path = "products/{$filename}";

        $initials = strtoupper(substr($product->name, 0, 2));
        $categoryName = $product->category?->name ?? 'Skillage Mart';

        $svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E3A8A"/>
      <stop offset="50%" stop-color="#1D4ED8"/>
      <stop offset="100%" stop-color="#0F172A"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#FBBF24"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#bgGrad)"/>
  <circle cx="200" cy="180" r="110" fill="none" stroke="url(#goldGrad)" stroke-width="4" opacity="0.4"/>
  <rect x="50" y="50" width="300" height="300" rx="24" fill="none" stroke="url(#goldGrad)" stroke-width="2" opacity="0.6"/>
  <text x="200" y="195" font-family="sans-serif" font-size="64" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">{$initials}</text>
  <rect x="70" y="275" width="260" height="36" rx="18" fill="url(#goldGrad)"/>
  <text x="200" y="299" font-family="sans-serif" font-size="13" font-weight="800" fill="#1E3A8A" text-anchor="middle" letter-spacing="1">{$categoryName}</text>
</svg>
SVG;

        Storage::disk('public')->put($path, $svg);

        if ($this->option('force')) {
            $product->images()->update(['is_primary' => false]);
        }

        ProductImage::create([
            'product_id' => $product->id,
            'path' => $path,
            'alt' => $product->name,
            'sort_order' => 1,
            'is_primary' => true,
        ]);

        $this->info("✓ Created styled fallback image for [{$product->name}] -> storage/app/public/{$path}");
    }
}

