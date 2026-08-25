<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $password = env('SEEDER_DEFAULT_PASSWORD', 'password');
        $pin = env('SEEDER_DEFAULT_PIN', '123456');

        $this->makeUser('owner', 'Owner Skillage Mart', $password, $pin);
        $this->makeUser('admin', 'Admin Skillage Mart', $password, $pin);
        $this->makeUser('supervisor', 'Supervisor Skillage Mart', $password, $pin);
        $this->makeUser('cashier', 'Kasir Satu', $password, $pin, 'kasir1');
        $this->makeUser('cashier', 'Kasir Dua', $password, $pin, 'kasir2');
        $this->makeUser('warehouse', 'Warehouse Skillage Mart', $password, $pin);
        $this->makeUser('treasurer', 'Bendahara Skillage Mart', $password, $pin);
    }

    private function makeUser(string $role, string $name, string $password, string $pin, ?string $usernameOverride = null): void
    {
        $username = $usernameOverride ?? $role;

        $user = User::where('username', $username)->first();

        if ($user === null) {
            $user = User::create([
                'username' => $username,
                'name' => $name,
                'email' => "{$username}@skillagemart.test",
                'password' => $password,
                'pin' => $pin,
                'is_active' => true,
            ]);
        } else {
            $user->update([
                'name' => $name,
                'email' => "{$username}@skillagemart.test",
                'password' => $password,
                'pin' => $pin,
                'is_active' => true,
            ]);
        }

        if (! $user->hasRole($role)) {
            $user->assignRole($role);
        }
    }
}
