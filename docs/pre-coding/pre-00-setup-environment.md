# PRE-00 — SETUP ENVIRONMENT LOKAL

**Tujuan:** menyiapkan mesin kerja  — Laragon, VSCode, Git, Node.js,
folder proyek — sampai siap menerima tahap-tahap berikutnya. Setelah tahap ini
selesai, folder `skillage-mart/` sudah berdiri sebagai monorepo dokumentasi
(belum ada kode aplikasi).

**Estimasi waktu:** 60 menit.
**Prasyarat:** Windows 10/11, koneksi internet.

---

## 1. LARAGON

Skillage Mart butuh: **PHP 8.3, MySQL 8, Node.js 20 LTS, Composer 2.**

### 1.1 Instalasi

- Unduh **Laragon Full** dari https://laragon.org (versi Full, bukan Lite —
  Lite tidak menyertakan MySQL).
- Install ke `C:\laragon` (default). Jangan di `Program Files`.
- Buka Laragon → tombol **Start All** → pastikan Apache & MySQL menyala hijau.

### 1.2 Sesuaikan versi PHP

Laragon terbaru biasanya sudah PHP 8.3. Verifikasi:

```powershell
php -v
# Harus muncul: PHP 8.3.x
```

Jika masih PHP 8.2 atau lebih lama:

- Menu Laragon → **PHP → Version → Tambah PHP baru** → unduh PHP 8.3 NTS x64
  dari windows.php.net, ekstrak ke `C:\laragon\bin\php\php-8.3.x-Win32-vs16-x64`
- Pilih versi tersebut di menu.

### 1.3 Aktifkan ekstensi PHP wajib

Edit `C:\laragon\bin\php\<versi-aktif>\php.ini`, pastikan tidak ada titik-koma
di depan baris berikut (hilangkan `;` bila ada):

```ini
extension=curl
extension=fileinfo
extension=gd
extension=intl
extension=mbstring
extension=mysqli
extension=openssl
extension=pdo_mysql
extension=zip
extension=bcmath
extension=exif
extension=sodium
```

Restart Laragon setelah menyimpan.

### 1.4 Composer

Laragon Full sudah menyertakan Composer. Verifikasi:

```powershell
composer --version
# Harus 2.x
```

### 1.5 Node.js

Laragon punya Node bawaan, tapi kadang tertinggal versi. Lebih aman pakai
Node dari installer resmi:

- Unduh **Node.js 20 LTS** dari https://nodejs.org
- Install, lalu verifikasi di PowerShell baru:

```powershell
node -v      # v20.x
npm -v       # 10.x
```

### 1.6 Konfigurasi MySQL

- Buka **HeidiSQL** dari menu Laragon (root, tanpa password default).
- Ubah password root: `Right-click root → Edit user → set password`. Simpan
  password ini di password manager Ziyad.
- Buat database kosong: **`skillage_mart_dev`** (character set: `utf8mb4`,
  collation: `utf8mb4_unicode_ci`).

---

## 2. VSCODE

### 2.1 Instalasi

Unduh dari https://code.visualstudio.com. Install untuk *current user*
(tidak perlu admin).

### 2.2 Extension wajib

Buka **Extensions (Ctrl+Shift+X)**, install satu-satu:

| Extension | Publisher | Guna |
|---|---|---|
| PHP Intelephense | Ben Mewburn | LSP PHP terbaik |
| Laravel Blade Snippets | Winnie Lin | Snippet blade |
| Laravel Extra Intellisense | amir | Auto-complete route, config |
| ESLint | Microsoft | Lint JS/TS |
| Prettier | Prettier | Format |
| Tailwind CSS IntelliSense | Tailwind Labs | Auto-complete class |
| ES7+ React/Redux Snippets | dsznajder | Snippet React |
| GitLens | GitKraken | Sejarah Git di editor |
| Error Lens | Alexander | Tampilkan error inline |
| DotENV | mikestead | Highlight .env |
| Markdown All in One | Yu Zhang | Editor markdown |
| MySQL | Weijan Chen | Query DB langsung dari VSCode |

Setelah semua terpasang, **nonaktifkan** extension PHP bawaan Microsoft (bikin
konflik dengan Intelephense).

### 2.3 Pengaturan `settings.json`

Buka **Command Palette (Ctrl+Shift+P) → Preferences: Open User Settings (JSON)**.
Tambahkan:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.tabSize": 2,
  "editor.rulers": [80, 120],
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true,
  "files.eol": "\n",
  "[php]": {
    "editor.defaultFormatter": "bmewburn.vscode-intelephense-client",
    "editor.tabSize": 4
  },
  "[blade]": {
    "editor.defaultFormatter": "shufo.vscode-blade-formatter"
  },
  "intelephense.environment.phpVersion": "8.3.0",
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "'([^']*)'"],
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

---

## 3. GIT

### 3.1 Instalasi

Laragon menyertakan Git, tapi versinya kadang tertinggal. Unduh yang terbaru
dari https://git-scm.com. Saat install, pilih:

- Default editor: **Visual Studio Code**
- Line ending: **Checkout as-is, commit Unix-style (LF)**
- HTTPS transport: **OpenSSL library**
- Credential helper: **Git Credential Manager**

### 3.2 Konfigurasi identitas

Buka PowerShell:

```powershell
git config --global user.name "Ziyad Fernanda"
git config --global user.email "email-anda@domain.com"
git config --global init.defaultBranch main
git config --global core.autocrlf input
git config --global pull.rebase false
```

### 3.3 SSH key untuk GitHub

```powershell
ssh-keygen -t ed25519 -C "email-anda@domain.com"
# Enter untuk semua prompt (tanpa passphrase untuk kemudahan lokal)

# Salin public key ke clipboard:
Get-Content ~/.ssh/id_ed25519.pub | Set-Clipboard
```

Buka https://github.com/settings/keys → **New SSH key** → paste. Uji:

```powershell
ssh -T git@github.com
# Harus muncul: Hi <username>! You've successfully authenticated...
```

---

## 4. FOLDER PROYEK

### 4.1 Lokasi

Buat folder di dalam www Laragon supaya bisa langsung di-serve:

```powershell
cd C:\laragon\www
mkdir skillage-mart
cd skillage-mart
```

**Catatan:** kode Laravel BELUM diinstall di sini. Folder ini dulu hanya untuk
dokumentasi persiapan. Kode Laravel dibuat nanti di **Fase 0** setelah gerbang
kesiapan lolos.

### 4.2 Struktur awal

```powershell
mkdir docs
mkdir docs\adr
mkdir docs\tickets
mkdir prompts

# File-file kosong yang akan diisi tahap berikutnya:
New-Item docs\CONTEXT.md
New-Item docs\SPEC.md
New-Item docs\PETA-KOMPONEN.md
New-Item docs\GERBANG-KESIAPAN.md
```

### 4.3 `.gitignore` awal

Buat `.gitignore` di root:

```gitignore
# OS
.DS_Store
Thumbs.db
desktop.ini

# Editor
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json
.idea/
*.swp

# Laravel (nanti akan aktif)
/vendor
/node_modules
/public/build
/public/hot
/public/storage
/storage/*.key
.env
.env.backup
.env.production
.phpunit.result.cache
Homestead.json
Homestead.yaml
auth.json
npm-debug.log
yarn-error.log
/.fleet

# 9Router
9router-config.local.json

# Dokumen sensitif
docs/private/
```

### 4.4 README proyek

Buat `README.md` di root:

```markdown
# Skillage Mart POS

Aplikasi Point of Sale untuk minimarket SMK Skill Village Islamic School.

**Stack:** Laravel 12 · Inertia.js · React 18 + TypeScript · Tailwind ·
shadcn/ui · MySQL 8

**Status:** Dalam tahap persiapan (belum ada kode aplikasi).

## Struktur

- `docs/` — dokumentasi persiapan (CONTEXT, SPEC, ADR, tiket)
- `prompts/` — prompt fase 0–18 untuk eksekusi coding
- (Kode Laravel akan dibuat setelah gerbang kesiapan lolos.)

## Cara Pakai

Baca `docs/README-pre-coding.md` untuk urutan tahap persiapan.
```

### 4.5 Init Git

```powershell
git init
git add .
git commit -m "chore: initial project structure"

# Buat repo di GitHub (private!), lalu:
git remote add origin git@github.com:username/skillage-mart.git
git branch -M main
git push -u origin main
```

**Penting:** repo **wajib private**. Isinya nanti mencakup jurnal akuntansi
dan data santri.

---

## 5. TOOLS AI YANG AKAN DIPAKAI

Belum di-install di tahap ini. Yang perlu Ziyad ketahui sekarang:

| Tool | Dipakai di | Cara install |
|---|---|---|
| Graphify | pre-01 (opsional) | `pip install graphifyy` |
| Skills (Matt Pocock) | pre-02, pre-03 | Perintah `/setup-matt-pocock-skills` di dalam Claude Code |
| 9Router | pre-04 | `npm install -g 9router` |
| shadcn/ui CLI | pre-05, dan seterusnya | `npx shadcn-ui@latest` |
| OpenCode | fase 0 dst. | `curl -fsSL https://opencode.ai/install \| bash` |
| Browser Use | verifikasi tiap fase | `pip install browser-use` |

**Belum perlu di-install semua sekarang.** Install saat tahap yang membutuhkan.

Yang perlu sekarang:

```powershell
# Python (untuk Graphify & Browser Use nanti)
# Unduh Python 3.12 dari python.org, centang "Add to PATH"
python --version    # 3.12.x

# uv (package manager Python cepat, opsional tapi disarankan)
irm https://astral.sh/uv/install.ps1 | iex
```

---

## CHECKLIST VERIFIKASI

- [ ] Laragon Full ter-install di `C:\laragon`, MySQL & Apache jalan hijau
- [ ] `php -v` menampilkan 8.3.x
- [ ] `composer --version` menampilkan 2.x
- [ ] `node -v` menampilkan v20.x
- [ ] `npm -v` menampilkan 10.x
- [ ] Database `skillage_mart_dev` sudah dibuat di HeidiSQL
- [ ] Password root MySQL sudah diubah dan disimpan di password manager
- [ ] VSCode ter-install dengan 12 extension di atas
- [ ] `settings.json` sudah dikonfigurasi
- [ ] Git ter-install, `git config --list --global` menampilkan nama & email Ziyad
- [ ] SSH key sudah ditambahkan ke GitHub, `ssh -T git@github.com` berhasil
- [ ] Folder `C:\laragon\www\skillage-mart` sudah berdiri
- [ ] Sub-folder `docs/`, `docs/adr/`, `docs/tickets/`, `prompts/` ada
- [ ] `.gitignore` dan `README.md` sudah dibuat
- [ ] Repo GitHub **private** sudah dibuat, `git push` pertama berhasil
- [ ] Python 3.12 ter-install (untuk tahap berikutnya)

---

**Setelah semua tercentang → lanjut ke `pre-01-graphify-referensi.md` (opsional)
atau langsung ke `pre-02-grill-requirement.md`.**
