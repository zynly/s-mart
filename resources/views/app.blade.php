<!DOCTYPE html>
<html lang="id">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title inertia>{{ config('app.name', 'Skillage Mart') }}</title>

        {{-- T-106: nonce dari SecurityHeaders middleware — dipakai CSP
             header (script-src) saat APP_ENV=production. Wajib match
             persis, kalau tidak skrip anti-FOUC ini diblokir browser
             dan tema gelap "berkedip" putih sebelum React mount. --}}
        <script nonce="{{ $cspNonce ?? '' }}">
            (function () {
                var theme = localStorage.getItem('theme');
                var isDark = theme === 'dark' || (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                document.documentElement.classList.toggle('dark', isDark);
            })();
        </script>

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx'])
        @inertiaHead
    </head>
    <body class="bg-bg text-content antialiased">
        @inertia
    </body>
</html>
