import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync, spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PROJECT_ROOT = path.join(__dirname, '..')
const TAURI_BUNDLE_DIR = path.join(PROJECT_ROOT, 'src-tauri/target')
const TARGET_DIR = '/home/pak-hakim/Hakim/Worker/Dokumen Arsip/Skill Village/POS Dekstop'
const LOG_FILE = path.join(PROJECT_ROOT, 'desktop-build.log')

const C_RESET = '\x1b[0m'
const C_CYAN = '\x1b[36m'
const C_GREEN = '\x1b[32m'
const C_YELLOW = '\x1b[33m'
const C_MAGENTA = '\x1b[35m'
const C_BOLD = '\x1b[1m'
const C_RED = '\x1b[31m'
const C_BLUE = '\x1b[34m'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function drawProgressBar(title, currentStep, totalSteps, percent, statusMsg) {
  const barWidth = 30
  const filled = Math.floor((percent / 100) * barWidth)
  const empty = barWidth - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)

  let color = C_YELLOW
  if (percent >= 100) color = C_GREEN

  process.stdout.write('\x1b[2K')
  process.stdout.write(`  ${C_BOLD}${C_CYAN}[${currentStep}/${totalSteps}] ${title}${C_RESET}\n`)
  process.stdout.write('\x1b[2K')
  process.stdout.write(`  ${color}[${bar}] ${percent}%${C_RESET} | ${statusMsg}\n`)
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function autoUninstallOldVersion() {
  console.log(`  🗑️  ${C_YELLOW}AUTO-UNINSTALL VERSI LAMA: Memeriksa dan mencabut instalasi lama...${C_RESET}`)
  
  const appsDir = path.join(os.homedir(), '.local/share/applications')
  const desktopFile = path.join(appsDir, 'skillage-mart-pos.desktop')
  if (fs.existsSync(desktopFile)) {
    try {
      fs.unlinkSync(desktopFile)
      console.log(`     └─> ✅ Shortcut versi lama (${desktopFile}) berhasil dicabut!`)
    } catch (e) {}
  }

  try {
    if (fs.existsSync(TARGET_DIR)) {
      const files = fs.readdirSync(TARGET_DIR)
      let deletedCount = 0
      for (const f of files) {
        if (f.endsWith('.exe') || f.endsWith('.msi') || f.endsWith('.AppImage') || f.endsWith('.deb') || f.endsWith('.zip')) {
          fs.unlinkSync(path.join(TARGET_DIR, f))
          deletedCount++
        }
      }
      console.log(`     └─> ✅ ${deletedCount} berkas installer lama di folder target dibersihkan!`)
    }
  } catch (e) {}

  try {
    execSync(`update-desktop-database "${appsDir}" 2>/dev/null`)
  } catch (e) {}
  console.log('')
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
}

async function simulateAnimatedStep(title, currentStep, totalSteps, durationMs, command) {
  const start = Date.now()
  let commandFinished = false
  let commandError = null
  let outputBuffer = ''

  const child = spawn('bash', ['-c', command], { cwd: PROJECT_ROOT })

  child.stdout.on('data', (d) => (outputBuffer += d.toString()))
  child.stderr.on('data', (d) => (outputBuffer += d.toString()))

  child.on('exit', (code) => {
    commandFinished = true
    if (code !== 0) {
      commandError = new Error(`Proses kompilasi '${title}' gagal dengan exit code ${code}`)
    }
  })

  while (!commandFinished) {
    const elapsed = Date.now() - start
    const fakePercent = Math.min(95, Math.floor((elapsed / durationMs) * 100))
    drawProgressBar(title, currentStep, totalSteps, fakePercent, 'Mengompilasi...')
    process.stdout.write('\x1b[2A')
    await sleep(80)
  }

  if (commandError) {
    drawProgressBar(title, currentStep, totalSteps, 0, `${C_RED}GAGAL!${C_RESET}`)
    process.stdout.write('\n\n')
    
    // Write output log to desktop-build.log
    fs.writeFileSync(LOG_FILE, outputBuffer, 'utf8')

    console.log(`${C_RED}========================================================================${C_RESET}`)
    console.log(`${C_BOLD}${C_RED}❌ TERJADI KESALAHAN PADA PROSES: ${title}${C_RESET}`)
    console.log(`${C_RED}========================================================================${C_RESET}`)
    console.log(`📄 Log Rincian Error Disimpan Ke: ${C_YELLOW}${LOG_FILE}${C_RESET}\n`)
    console.log(`${C_BOLD}Rincian Baris Error Terakhir:${C_RESET}`)
    
    const lines = outputBuffer.split('\n').filter(Boolean)
    const lastLines = lines.slice(-25).join('\n')
    console.log(`${C_RED}${lastLines}${C_RESET}`)
    console.log(`${C_RED}========================================================================${C_RESET}\n`)
    
    throw commandError
  }

  drawProgressBar(title, currentStep, totalSteps, 100, `${C_GREEN}Selesai 100%!${C_RESET}`)
  process.stdout.write('\n\n')
}

async function run() {
  console.clear()
  console.log(`${C_CYAN}========================================================================${C_RESET}`)
  console.log(`${C_BOLD}${C_MAGENTA}       🏪 SKILLAGE MART — DUAL-OS (LINUX & WINDOWS) BUILD ENGINE ${C_RESET}`)
  console.log(`${C_CYAN}========================================================================${C_RESET}`)
  console.log(` Target OS     : ${C_GREEN}🐧 Linux (.AppImage & .deb)${C_RESET} + ${C_BLUE}🪟 Windows (.exe & .msi)${C_RESET}`)
  console.log(` Target Folder : ${C_YELLOW}${TARGET_DIR}${C_RESET}`)
  console.log(` Target Domain : ${C_GREEN}https://pos.skillage-mart.com${C_RESET}`)
  console.log(`${C_CYAN}========================================================================${C_RESET}\n`)

  ensureDir(TARGET_DIR)

  // Step 1: Vite Frontend Build (0 - 100%)
  try {
    await simulateAnimatedStep(
      'Membangun Frontend Vite Assets (React/Inertia)',
      1,
      4,
      8000,
      'pnpm build'
    )
  } catch (e) {
    process.exit(1)
  }

  // Step 2: Linux Native Compilation (0 - 100%)
  try {
    await simulateAnimatedStep(
      '🐧 Membangun Installer Linux (.deb & App Package)',
      2,
      4,
      12000,
      'NO_STRIP=1 pnpm tauri build --bundles deb'
    )
  } catch (e) {
    process.exit(1)
  }

  // Step 3: Windows Native Cross-Compilation (0 - 100%)
  try {
    await simulateAnimatedStep(
      '🪟 Membangun Installer Windows (.exe & .msi)',
      3,
      4,
      15000,
      'pnpm tauri build --target x86_64-pc-windows-gnu'
    )
  } catch (e) {
    console.log(`⚠️ ${C_YELLOW}Cross-compile Windows dilewati (memerlukan toolchain Windows complete).${C_RESET}`)
    process.stdout.write('\n\n')
  }

  // Step 4: Auto-Uninstall Old & Final Assembly (0 - 100%)
  drawProgressBar('🚚 Auto-Uninstall Lama, Salin Installer Baru & Registrasi Menu', 4, 4, 10, 'Mencabut & menghapus versi lama...')
  await sleep(300)

  autoUninstallOldVersion()

  drawProgressBar('🚚 Auto-Uninstall Lama, Salin Installer Baru & Registrasi Menu', 4, 4, 50, 'Menyalin berkas installer versi baru...')
  await sleep(300)

  const builtFiles = findBuiltFiles(TAURI_BUNDLE_DIR, ['.AppImage', '.deb', '.exe', '.msi'])
  const copiedFiles = []

  for (const srcPath of builtFiles) {
    const fileName = path.basename(srcPath)
    const destPath = path.join(TARGET_DIR, fileName)
    fs.copyFileSync(srcPath, destPath)
    copiedFiles.push(destPath)
  }

  drawProgressBar('🚚 Auto-Uninstall Lama, Salin Installer Baru & Registrasi Menu', 4, 4, 100, `${C_GREEN}Instalasi Baru Terpasang 100%!${C_RESET}`)
  process.stdout.write('\n\n')

  console.log(`${C_CYAN}========================================================================${C_RESET}`)
  console.log(`${C_BOLD}${C_GREEN}🎉 DUAL-OS BUILD & INSTALL BARU SELESAI 100%!${C_RESET}`)
  console.log(`${C_CYAN}========================================================================${C_RESET}`)
  if (copiedFiles.length > 0) {
    copiedFiles.forEach((f) => console.log(`  📦 ${path.basename(f)}`))
  }
  console.log(`\n📁 Lokasi Penyimpanan : ${C_YELLOW}${TARGET_DIR}${C_RESET}`)

  const currentPlatform = os.platform()
  console.log(`${C_CYAN}========================================================================${C_RESET}`)
  console.log(`${C_BOLD}${C_GREEN}🔍 AUTO-UNINSTALL LAMA & AUTO-INSTALL BARU STATUS:${C_RESET}`)
  console.log(`${C_CYAN}========================================================================${C_RESET}`)

  if (currentPlatform === 'linux') {
    const appImage = copiedFiles.find((f) => f.endsWith('.AppImage'))
    if (appImage) {
      fs.chmodSync(appImage, '755')
      registerLinuxAppMenu(appImage)
      console.log(`  🗑️ ${C_YELLOW}Auto-Uninstall     : VERSI LAMA BERHASIL DICABUT DARI SISTEM!${C_RESET}`)
      console.log(`  🐧 ${C_GREEN}OS Terdeteksi       : LINUX (${os.arch()})${C_RESET}`)
      console.log(`  ✅ ${C_GREEN}Status Auto-Install : VERSI BARU SUKSES DIDAFTARKAN!${C_RESET}`)
      console.log(`  📱 ${C_YELLOW}Menu Aplikasi OS   : Skillage Mart POS MUNCUL LANGSUNG di OS Menu Linux Anda!${C_RESET}`)
      console.log(`  🚀 ${C_CYAN}Buka Langsung       : Cari "Skillage Mart POS" di Application Launcher / Start Menu Linux.${C_RESET}`)
    }
  } else if (currentPlatform === 'win32') {
    const exeFile = copiedFiles.find((f) => f.endsWith('.exe'))
    if (exeFile) {
      console.log(`  🗑️ ${C_YELLOW}Auto-Uninstall     : VERSI LAMA BERHASIL DIBERSIHKAN!${C_RESET}`)
      console.log(`  🪟 ${C_GREEN}OS Terdeteksi       : WINDOWS (${os.arch()})${C_RESET}`)
      console.log(`  ✅ ${C_GREEN}Status Auto-Install : VERSI BARU BERKAS SETUP SIAP!${C_RESET}`)
      console.log(`  🚀 ${C_CYAN}Auto-Launch Setup  : Membuka Installer ${path.basename(exeFile)}...${C_RESET}`)
      try {
        execSync(`start "" "${exeFile}"`, { stdio: 'ignore' })
      } catch (e) {}
    }
  }
  console.log(`${C_CYAN}========================================================================${C_RESET}\n`)
}

run()
