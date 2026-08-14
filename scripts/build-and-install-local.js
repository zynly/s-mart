import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PROJECT_ROOT = path.join(__dirname, '..')
const TAURI_BUNDLE_DIR = path.join(PROJECT_ROOT, 'src-tauri/target/release/bundle')
const TARGET_DIR = '/home/pak-hakim/Hakim/Worker/Dokumen Arsip/Skill Village/POS Dekstop'

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function cleanOldFiles(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return
    const files = fs.readdirSync(dirPath)
    for (const f of files) {
      if (f.endsWith('.exe') || f.endsWith('.msi') || f.endsWith('.AppImage') || f.endsWith('.deb') || f.endsWith('.zip')) {
        fs.unlinkSync(path.join(dirPath, f))
      }
    }
    console.log('🧹 Berkas installer lama berhasil dibersihkan dari folder target!')
  } catch (e) {
    console.log('⚠️ Peringatan pembersihan:', e.message)
  }
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src)
  const stats = exists && fs.statSync(src)
  const isDirectory = exists && stats.isDirectory()
  if (isDirectory) {
    ensureDir(dest)
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName))
    })
  } else {
    fs.copyFileSync(src, dest)
  }
}

function findBuiltFiles(dir, extensions) {
  let results = []
  if (!fs.existsSync(dir)) return results
  const list = fs.readdirSync(dir)
  for (const file of list) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (stat && stat.isDirectory()) {
      results = results.concat(findBuiltFiles(filePath, extensions))
    } else {
      if (extensions.some((ext) => file.endsWith(ext))) {
        results.push(filePath)
      }
    }
  }
  return results
}

function registerLinuxAppMenu(appImagePath) {
  const appsDir = path.join(os.homedir(), '.local/share/applications')
  ensureDir(appsDir)

  const desktopFile = path.join(appsDir, 'skillage-mart-pos.desktop')
  const desktopContent = `[Desktop Entry]
Name=Skillage Mart POS
Comment=Skillage Mart POS & Retail Store Management System
Exec="${appImagePath}"
Terminal=false
Type=Application
Categories=Office;Finance;Utility;POS;
StartupNotify=true
`
  fs.writeFileSync(desktopFile, desktopContent, 'utf8')
  fs.chmodSync(desktopFile, '755')

  try {
    execSync(`update-desktop-database "${appsDir}" 2>/dev/null`)
  } catch (e) {}

  console.log(`\n📱 App Shortcut berhasil didaftarkan ke Menu Aplikasi OS Linux:`)
  console.log(`   └─> ${desktopFile}`)
  console.log(`🎉 Skillage Mart POS kini LANGSUNG MUNCUL di Menu Aplikasi OS Linux Anda!`)
}

async function run() {
  console.log('========================================================================')
  console.log('       🛠️ SKILLAGE MART — BUILD & INSTALL DESKTOP LOKAL')
  console.log('========================================================================\n')

  ensureDir(TARGET_DIR)

  console.log('1️⃣ Membangun paket frontend (Vite)...')
  try {
    execSync('pnpm build', { cwd: PROJECT_ROOT, stdio: 'inherit' })
  } catch (e) {
    console.error('❌ Gagal build frontend:', e.message)
    process.exit(1)
  }

  console.log('\n2️⃣ Membangun aplikasi desktop native lokal (Tauri)...')
  try {
    execSync('pnpm desktop:build', { cwd: PROJECT_ROOT, stdio: 'inherit' })
  } catch (e) {
    console.error('❌ Gagal build tauri:', e.message)
    process.exit(1)
  }

  console.log('\n3️⃣ Memindahkan hasil build ke folder target...')
  cleanOldFiles(TARGET_DIR)

  const builtFiles = findBuiltFiles(TAURI_BUNDLE_DIR, ['.AppImage', '.deb', '.exe', '.msi'])

  if (builtFiles.length === 0) {
    console.error('⚠️ Tidak ditemukan berkas installer pada target build Tauri.')
    process.exit(1)
  }

  const copiedFiles = []
  for (const srcPath of builtFiles) {
    const fileName = path.basename(srcPath)
    const destPath = path.join(TARGET_DIR, fileName)
    fs.copyFileSync(srcPath, destPath)
    copiedFiles.push(destPath)
    console.log(`✅ Tersimpan: ${destPath}`)
  }

  // Handle Linux setup
  if (os.platform() === 'linux') {
    const appImage = copiedFiles.find((f) => f.endsWith('.AppImage'))
    if (appImage) {
      fs.chmodSync(appImage, '755')
      console.log(`🔑 Izin eksekusi (chmod +x) diberikan ke: ${path.basename(appImage)}`)
      registerLinuxAppMenu(appImage)
    }
  }

  console.log('\n========================================================================')
  console.log(`🎉 HARI INI BIKIN LOKAL SELESAI 100%!`)
  console.log(`📁 Seluruh installer tersimpan di: ${TARGET_DIR}`)
  console.log('========================================================================\n')
}

run()
