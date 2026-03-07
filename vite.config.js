import { defineConfig } from 'vite'
import { resolve } from 'path'
import fs from 'fs'

function csvField(v) {
  const s = String(v ?? '')
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? '"' + s.replace(/"/g, '""') + '"'
    : s
}

function apiHandler(fn) {
  return (req, res) => {
    if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        fn(JSON.parse(body), res)
      } catch (e) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: false, error: e.message }))
      }
    })
  }
}

function readCSV() {
  const csvPath = resolve(__dirname, 'public/data/concerts.csv')
  const text = fs.readFileSync(csvPath, 'utf8')
  const lines = text.split('\n')
  const header = lines[0]
  const dataLines = lines.slice(1).filter(l => l.trim())
  return { csvPath, header, dataLines }
}

function cmsApi() {
  return {
    name: 'cms-api',
    configureServer(server) {
      server.middlewares.use('/api/add-concert', apiHandler((d, res) => {
        const { csvPath, header, dataLines } = readCSV()
        const row = [d.date, d.artist, d.support, d.festival ? 'Yes' : '', d.tour, d.venue, d.city, d.country, d.friends, d.notes].map(csvField).join(',')
        fs.writeFileSync(csvPath, header + '\n' + dataLines.join('\n') + '\n' + row + '\n', 'utf8')
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true }))
      }))

      server.middlewares.use('/api/edit-concert', apiHandler((d, res) => {
        const { csvPath, header, dataLines } = readCSV()
        const idx = parseInt(d.rowIndex)
        if (idx < 0 || idx >= dataLines.length) throw new Error('Invalid row index')
        dataLines[idx] = [d.date, d.artist, d.support, d.festival ? 'Yes' : '', d.tour, d.venue, d.city, d.country, d.friends, d.notes].map(csvField).join(',')
        fs.writeFileSync(csvPath, header + '\n' + dataLines.join('\n') + '\n', 'utf8')
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true }))
      }))

      server.middlewares.use('/api/delete-concert', apiHandler((d, res) => {
        const { csvPath, header, dataLines } = readCSV()
        const idx = parseInt(d.rowIndex)
        if (idx < 0 || idx >= dataLines.length) throw new Error('Invalid row index')
        dataLines.splice(idx, 1)
        fs.writeFileSync(csvPath, header + '\n' + dataLines.join('\n') + '\n', 'utf8')
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true }))
      }))
    },
  }
}

// Custom plugin: rewrites deep sub-routes to their page's index.html
// so that refreshing on a History API URL (e.g. /concert-archive/artists/coldplay)
// serves the right HTML rather than a 404.
function mpaFallback() {
  return {
    name: 'mpa-fallback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url.split('?')[0]

        // Don't rewrite real file requests (JS, CSS, assets, etc.)
        if (/\.\w+$/.test(url)) return next()

        if (url.startsWith('/concert-archive')) {
          req.url = '/concert-archive/index.html'
        } else if (url.startsWith('/portfolio')) {
          req.url = '/portfolio/index.html'
        } else if (url.startsWith('/about-me')) {
          req.url = '/about-me/index.html'
        } else if (url.startsWith('/my-work')) {
          req.url = '/my-work/index.html'
        } else if (url.startsWith('/say-hi')) {
          req.url = '/say-hi/index.html'
        } else if (url.startsWith('/cms')) {
          req.url = '/cms/index.html'
        }

        next()
      })
    },
  }
}

export default defineConfig({
  root: '.',
  appType: 'mpa',
  plugins: [cmsApi(), mpaFallback()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        aboutMe: resolve(__dirname, 'about-me/index.html'),
        myWork: resolve(__dirname, 'my-work/index.html'),
        concertArchive: resolve(__dirname, 'concert-archive/index.html'),
        sayHi: resolve(__dirname, 'say-hi/index.html'),
        portfolio: resolve(__dirname, 'portfolio/index.html'),
        cms: resolve(__dirname, 'cms/index.html'),
      },
    },
  },
})
