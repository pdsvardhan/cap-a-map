import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

// Dev-only endpoint: receives review comments from the in-app comment tool
// (src/dev/FeedbackTool.jsx) and writes them into ./feedback as <id>.json + <id>.jpg
// so the AI agent can read them with full context. Never runs in production.
function feedbackPlugin() {
  return {
    name: 'capa-feedback',
    apply: 'serve',
    configureServer(server) {
      const dir = path.resolve(server.config.root, 'feedback')
      server.middlewares.use('/__feedback', (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body = ''
        req.on('data', (c) => { body += c })
        req.on('end', () => {
          try {
            const data = JSON.parse(body)
            fs.mkdirSync(dir, { recursive: true })
            const id = new Date().toISOString().replace(/[:.]/g, '-')
            const { screenshot, ...meta } = data
            meta.id = id
            if (screenshot && screenshot.startsWith('data:image')) {
              const b64 = screenshot.replace(/^data:image\/\w+;base64,/, '')
              fs.writeFileSync(path.join(dir, `${id}.jpg`), Buffer.from(b64, 'base64'))
              meta.screenshot = `${id}.jpg`
            }
            fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(meta, null, 2))
            res.statusCode = 200
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ ok: true, id }))
          } catch (e) {
            res.statusCode = 500
            res.end(JSON.stringify({ ok: false, error: String(e) }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), feedbackPlugin()],
  server: { port: 3000, open: false },
  build: { outDir: 'dist', sourcemap: true },
})
