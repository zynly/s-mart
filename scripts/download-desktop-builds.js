import fs from 'fs'
import path from 'path'
import https from 'https'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const REPO_OWNER = 'velora-1d'
const REPO_NAME = 'POS-Skillage'
const OUTPUT_DIR = path.join(__dirname, '../desktop-builds')

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
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

async function run() {
  console.log(`\n🔍 Memeriksa berkas rilis desktop terbaru dari GitHub (${REPO_OWNER}/${REPO_NAME})...`)

  try {
    const releases = await fetchJson(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`)

    if (!Array.isArray(releases) || releases.length === 0) {
      console.log('\n⚠️ Belum ada rilis berkas desktop di GitHub.')
      console.log('💡 Silakan jalankan Opsi [1] pada ./release untuk memicu build GitHub Actions!')
      return
    }

    const latestRelease = releases[0]
    const versionTag = latestRelease.tag_name || latestRelease.name || 'v1.0.0'
    console.log(`📌 versi Rilis Aktif: ${versionTag} (${latestRelease.name})`)

    if (!latestRelease.assets || latestRelease.assets.length === 0) {
      console.log('⚠️ Belum ada berkas installer yang terlampir pada rilis versi ini.')
      return
    }

    for (const asset of latestRelease.assets) {
      const fileName = asset.name
      const downloadUrl = asset.browser_download_url
      const targetPath = path.join(OUTPUT_DIR, fileName)

      await downloadFileWithProgress(downloadUrl, targetPath, fileName, versionTag)
    }

    console.log(`\n🎉 Seluruh berkas installer [${versionTag}] berhasil diunduh 100% di: ${OUTPUT_DIR}`)
  } catch (error) {
    console.error('\n❌ Gagal mengunduh berkas:', error.message)
  }
}

run()
