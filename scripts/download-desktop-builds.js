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

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath)
    const options = {
      headers: {
        'User-Agent': 'NodeJS-Downloader-Script',
      },
    }

    https.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download: HTTP ${res.statusCode}`))
      }
      res.pipe(file)
      file.on('finish', () => {
        file.close(() => resolve())
      })
    }).on('error', (err) => {
      fs.unlink(destPath, () => {})
      reject(err)
    })
  })
}

async function run() {
  console.log(`🔍 Memeriksa berkas rilis desktop terbaru dari GitHub (${REPO_OWNER}/${REPO_NAME})...`)

  try {
    const releases = await fetchJson(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`)

    if (!Array.isArray(releases) || releases.length === 0) {
      console.log('⚠️ Belum ada rilis/release berkas desktop di GitHub.')
      console.log('💡 Silakan jalankan GitHub Actions (push ke main) terlebih dahulu!')
      return
    }

    const latestRelease = releases[0]
    console.log(`📦 Ditemukan Rilis: ${latestRelease.name || latestRelease.tag_name}`)

    if (!latestRelease.assets || latestRelease.assets.length === 0) {
      console.log('⚠️ Belum ada berkas installer yang terlampir pada rilis ini.')
      return
    }

    for (const asset of latestRelease.assets) {
      const fileName = asset.name
      const downloadUrl = asset.browser_download_url
      const targetPath = path.join(OUTPUT_DIR, fileName)

      console.log(`⬇️ Mengunduh: ${fileName} (${(asset.size / 1024 / 1024).toFixed(2)} MB)...`)
      await downloadFile(downloadUrl, targetPath)
      console.log(`✅ Berhasil diunduh ke: ${targetPath}`)
    }

    console.log(`\n🎉 Seluruh berkas installer desktop berhasil disimpan di folder: ${OUTPUT_DIR}`)
  } catch (error) {
    console.error('❌ Gagal mengunduh berkas:', error.message)
  }
}

run()
