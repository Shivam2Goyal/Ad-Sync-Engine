import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { generatePersonalizedPage } from './scraper.js'
import 'dotenv/config'

const app = express()
const upload = multer({ storage: multer.memoryStorage() })
const PORT = process.env.PORT || 3001

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(cors())
app.use(express.json())

app.post('/api/generate', upload.single('adFile'), async (req, res) => {
  try {
    const { adUrl, pageUrl } = req.body
    const adFile = req.file

    if (!pageUrl) return res.status(400).json({ error: 'pageUrl is required' })
    if (!adFile && !adUrl) return res.status(400).json({ error: 'Ad creative is required' })

    const result = await generatePersonalizedPage({ adFile, adUrl, pageUrl })
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).send(err.message)
  }
})

// Serve static frontend in production
app.use(express.static(path.join(__dirname, '../dist')))
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))