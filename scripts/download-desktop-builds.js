import fs from 'fs'
import path from 'path'
import https from 'https'
import os from 'os'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const REPO_OWNER = 'zynly'
const REPO_NAME = 's-mart'

// Direct Target Directory requested by User
const PRIMARY_OUTPUT_DIR = '/home/pak-hakim/Hakim/Worker/Dokumen Arsip/Skill Village/POS Dekstop'
const FALLBACK_OUTPUT_DIR = path.join(__dirname, '../desktop-builds')

let OUTPUT_DIR = PRIMARY_OUTPUT_DIR
try {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }
} catch (e) {
  OUTPUT_DIR = FALLBACK_OUTPUT_DIR
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'NodeJS-Downloader-Script',
        'Accept': 'application/vnd.github.v3+json',
      },
    }

    https.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve).catch(reject)
      }
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

function downloadFileWithProgress(url, destPath, fileName, versionTag) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath)
    const options = {
      headers: {
        'User-Agent': 'NodeJS-Downloader-Script',
      },
    }

    https.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFileWithProgress(res.headers.location, destPath, fileName, versionTag).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Gagal mengunduh berkas: HTTP status ${res.statusCode}`))
      }

      const totalBytes = parseInt(res.headers['content-length'] || '0', 10)
      let downloadedBytes = 0

      console.log(`\n⬇️  Mengunduh Versi [${versionTag}] — ${fileName}`)

      res.on('data', (chunk) => {
        downloadedBytes += chunk.length
        if (totalBytes > 0) {
          const percent = Math.min(100, Math.floor((downloadedBytes / totalBytes) * 100))
          const barLength = 25
          const filledLength = Math.floor((percent / 100) * barLength)
          const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength)
          const dlMB = (downloadedBytes / 1024 / 1024).toFixed(1)
          const totalMB = (totalBytes / 1024 / 1024).toFixed(1)

          process.stdout.write(
            `\r  [${bar}] ${percent}% (${dlMB} MB / ${totalMB} MB)`
          )
        } else {
          const dlMB = (downloadedBytes / 1024 / 1024).toFixed(1)
          process.stdout.write(`\r  Mengunduh: ${dlMB} MB...`)
        }
      })

      res.pipe(file)

      file.on('finish', () => {
        file.close(() => {
          process.stdout.write('\n  ✅ Selesai 100%!\n')
          resolve()
        })
      })
    }).on('error', (err) => {
      fs.unlink(destPath, () => {})
      reject(err)
    })
  })
}

function cleanOldFiles(dirPath) {
  try {
    const files = fs.readdirSync(dirPath)
    for (const f of files) {
      if (f.endsWith('.exe') || f.endsWith('.msi') || f.endsWith('.AppImage') || f.endsWith('.deb') || f.endsWith('.zip')) {
        fs.unlinkSync(path.join(dirPath, f))
      }
    }
    console.log('🧹 Berkas installer lama berhasil dibersihkan!')
  } catch (e) {
    // Ignore error
  }
}

function installForCurrentOS(downloadedFiles) {
  const currentOS = os.platform()
  console.log(`\n💻 Deteksi OS Komputer Saat Ini: ${currentOS.toUpperCase()}`)

  if (currentOS === 'linux') {
    // Find AppImage or deb
    const appImageFile = downloadedFiles.find((f) => f.endsWith('.AppImage'))
    const debFile = downloadedFiles.find((f) => f.endsWith('.deb'))

    if (appImageFile) {
      const fullAppImagePath = path.join(OUTPUT_DIR, appImageFile)
      try {
        // Set execute permissions
        fs.chmodSync(fullAppImagePath, '755')
        console.log(`🔑 Izin eksekusi (chmod +x) telah diaktifkan pada: ${appImageFile}`)

        // Create .desktop shortcut for Linux Application Menu
        const appsDir = path.join(os.homedir(), '.local/share/applications')
        if (!fs.existsSync(appsDir)) {
          fs.mkdirSync(appsDir, { recursive: true })
        }

        const desktopFile = path.join(appsDir, 'skillage-mart-pos.desktop')
        const desktopContent = `[Desktop Entry]
Name=Skillage Mart POS
Comment=Skillage Mart POS & Retail Store Management System
Exec="${fullAppImagePath}"
Terminal=false
Type=Application
Categories=Office;Finance;Utility;POS;
StartupNotify=true
`
        fs.writeFileSync(desktopFile, desktopContent, 'utf8')
        fs.chmodSync(desktopFile, '755')
        console.log(`📱 Shortcut aplikasi telah didaftarkan ke Menu Aplikasi Linux:`)
        console.log(`   └─> ${desktopFile}`)

        // Update desktop database if tool exists
        try {
          execSync(`update-desktop-database "${appsDir}" 2>/dev/null`)
        } catch (e) {}

        console.log(`\n🎉 HARI INI: Skillage Mart POS sudah muncul langsung di Menu Aplikasi OS Linux Anda!`)
      } catch (err) {
        console.error('⚠️ Gagal membuat shortcut aplikasi Linux:', err.message)
      }
    } else if (debFile) {
      console.log(`📌 Berkas .deb ditemukan: ${debFile}`)
      console.log(`   Untuk menginstal ke sistem: sudo dpkg -i "${path.join(OUTPUT_DIR, debFile)}"`)
    }
  } else if (currentOS === 'win32') {
    const exeFile = downloadedFiles.find((f) => f.endsWith('.exe'))
    if (exeFile) {
      console.log(`\n🎉 Berkas installer Windows siap: ${exeFile}`)
      console.log(`   Jalankan file setup tersebut untuk menginstal ke Windows.`)
    }
  }
}

async function run() {
  console.log(`\n📁 Direktori Output Penyimpanan:`)
  console.log(`   └─> ${OUTPUT_DIR}`)
  console.log(`🔍 Memeriksa berkas rilis desktop terbaru dari GitHub (${REPO_OWNER}/${REPO_NAME})...`)

  try {
    const releases = await fetchJson(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`)

    if (!Array.isArray(releases) || releases.length === 0) {
      console.log('\n⚠️ Belum ada rilis berkas desktop di GitHub.')
      console.log('💡 Silakan jalankan Opsi [1] pada ./release untuk memicu build GitHub Actions!')
      return
    }

    const latestRelease = releases[0]
    const versionTag = latestRelease.tag_name || latestRelease.name || 'v1.0.0'
    console.log(`📌 Versi Rilis Aktif: ${versionTag} (${latestRelease.name})`)

    if (!latestRelease.assets || latestRelease.assets.length === 0) {
      console.log('⚠️ Belum ada berkas installer yang terlampir pada rilis versi ini.')
      return
    }

    // Clean old installers first
    cleanOldFiles(OUTPUT_DIR)

    const downloadedFiles = []
    for (const asset of latestRelease.assets) {
      const fileName = asset.name
      const downloadUrl = asset.browser_download_url
      const targetPath = path.join(OUTPUT_DIR, fileName)

      await downloadFileWithProgress(downloadUrl, targetPath, fileName, versionTag)
      downloadedFiles.push(fileName)
    }

    console.log(`\n🎉 Seluruh berkas installer [${versionTag}] berhasil disimpan 100% di:`)
    console.log(`   └─> ${OUTPUT_DIR}`)

    // Auto-install / create app menu shortcut for current OS
    installForCurrentOS(downloadedFiles)
  } catch (error) {
    console.error('\n❌ Gagal mengunduh berkas:', error.message)
  }
}

run()
