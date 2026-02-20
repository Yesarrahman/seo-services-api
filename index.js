const express = require('express')
const axios = require('axios')
const cheerio = require('cheerio')
const puppeteer = require('puppeteer')

const app = express()
app.use(express.json({ limit: '10mb' }))

// ============================================
// HELPERS
// ============================================

function extractSEOFromCheerio($, url) {
  const title = $('title').text().trim()
  const metaDescription = $('meta[name="description"]').attr('content') || ''
  const h1 = $('h1').first().text().trim()
  const h2s = $('h2').map((i, el) => $(el).text().trim()).get()
  const bodyText = $('body').text()
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length
  const canonical = $('link[rel="canonical"]').attr('href') || ''
  let schema = null
  const schemaEl = $('script[type="application/ld+json"]').first()
  if (schemaEl.length) {
    try { schema = JSON.parse(schemaEl.html()) } catch (e) { }
  }
  const hostname = new URL(url).hostname
  const internalLinks = $('a[href^="/"], a[href*="' + hostname + '"]').length
  const externalLinks = Math.max(0, $('a[href^="http"]').length - internalLinks)
  return { url, title, metaDescription, h1, h2s, wordCount, canonical, schema, internalLinksCount: internalLinks, externalLinksCount: externalLinks }
}

async function crawlWithAxios(url, extractData) {
  const response = await axios.get(url, {
    timeout: 20000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    maxRedirects: 5,
  })
  const $ = cheerio.load(response.data)
  if (!extractData) return { url, html: $.html() }
  return extractSEOFromCheerio($, url)
}

async function crawlWithPuppeteer(url, extractData) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--single-process',
      '--disable-extensions',
    ],
    timeout: 60000,
  })
  try {
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise(r => setTimeout(r, 2500))

    if (!extractData) {
      const html = await page.content()
      return { url, html }
    }

    const data = await page.evaluate((pageUrl) => {
      const title = document.title || ''
      const metaDesc = document.querySelector('meta[name="description"]')
      const metaDescription = metaDesc ? metaDesc.getAttribute('content') : ''
      const h1El = document.querySelector('h1')
      const h1 = h1El ? h1El.innerText.trim() : ''
      const h2s = Array.from(document.querySelectorAll('h2')).map(el => el.innerText.trim())
      const bodyText = document.body ? document.body.innerText : ''
      const wordCount = bodyText.split(/\s+/).filter(Boolean).length
      const canonicalEl = document.querySelector('link[rel="canonical"]')
      const canonical = canonicalEl ? canonicalEl.getAttribute('href') : ''
      let schema = null
      const schemaEl = document.querySelector('script[type="application/ld+json"]')
      if (schemaEl) { try { schema = JSON.parse(schemaEl.innerText) } catch (e) { } }
      const hostname = new URL(pageUrl).hostname
      const allLinks = Array.from(document.querySelectorAll('a[href]'))
      const internalLinks = allLinks.filter(a => a.href.startsWith('/') || a.href.includes(hostname)).length
      const externalLinks = Math.max(0, allLinks.filter(a => a.href.startsWith('http')).length - internalLinks)
      return { url: pageUrl, title, metaDescription, h1, h2s, wordCount, canonical, schema, internalLinksCount: internalLinks, externalLinksCount: externalLinks }
    }, url)

    return data
  } finally {
    await browser.close()
  }
}

// ============================================
// CRAWL ENDPOINTS
// ============================================

app.post('/crawl', async (req, res) => {
  const { url, extractData = true } = req.body
  if (!url) return res.status(400).json({ error: 'URL is required' })

  try {
    let result = null
    let method = 'axios'

    // Step 1: Try axios + cheerio (fast, concurrent-safe, no lock files)
    try {
      result = await crawlWithAxios(url, extractData)
      console.log(`Axios crawl for ${url}: title="${result.title}", wordCount=${result.wordCount}, h1="${result.h1}"`)
    } catch (e) {
      console.log(`Axios failed for ${url}: ${e.message}`)
    }

    // Step 2: Fall back to Puppeteer if content is empty (JS-rendered site)
    const isEmpty = !result || result.wordCount === 0 || (!result.h1 && (!result.h2s || result.h2s.length === 0))
    if (isEmpty) {
      console.log(`Falling back to Puppeteer for ${url}...`)
      method = 'puppeteer'
      result = await crawlWithPuppeteer(url, extractData)
    }

    console.log(`Crawled ${url} via ${method}: title="${result.title}", h1="${result.h1}", h2s=${result.h2s?.length}, words=${result.wordCount}`)
    res.json(result)

  } catch (error) {
    console.error('Crawl error:', error.message)
    res.status(500).json({ error: 'Failed to crawl URL', message: error.message })
  }
})

app.post('/crawl-blog', async (req, res) => {
  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'URL is required' })

  try {
    const articles = []
    const response = await axios.get(url, {
      timeout: 20000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0)' }
    })
    const $ = cheerio.load(response.data)
    const baseUrl = new URL(url)

    const articleLinks = $('a[href*="/blog/"], a[href*="/article/"], a[href*="/post/"]')
      .map((i, el) => $(el).attr('href')).get().filter(Boolean)
      .map(href => href.startsWith('/') ? `${baseUrl.protocol}//${baseUrl.host}${href}` : href)
      .filter((href, index, self) => self.indexOf(href) === index).slice(0, 20)

    for (const link of articleLinks) {
      try {
        const articleRes = await axios.get(link, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0)' } })
        const a$ = cheerio.load(articleRes.data)
        const title = a$('h1').first().text().trim() || a$('title').text().trim()
        const h2s = a$('h2').map((i, el) => a$(el).text().trim()).get()
        const bodyText = a$('article, main, .content, .post-content').text()
        const wordCount = bodyText.split(/\s+/).filter(Boolean).length
        const words = bodyText.toLowerCase().match(/\b\w{4,}\b/g) || []
        const wordFreq = {}
        words.forEach(word => {
          if (!['this', 'that', 'with', 'from', 'have', 'been', 'were'].includes(word)) wordFreq[word] = (wordFreq[word] || 0) + 1
        })
        const keywords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 10).reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {})
        const dateEl = a$('time[datetime]')
        articles.push({ url: link, title, h2s, keywords, publishedDate: dateEl.length ? dateEl.attr('datetime') : null, wordCount })
      } catch (e) {
        console.error(`Failed to crawl article ${link}:`, e.message)
      }
    }

    res.json({ articles })
  } catch (error) {
    console.error('Blog crawl error:', error.message)
    res.status(500).json({ error: 'Failed to crawl blog', message: error.message })
  }
})

// ============================================
// PDF GENERATION
// ============================================

app.post('/generate-pdf', async (req, res) => {
  const { html, fileName = 'report.pdf' } = req.body
  if (!html) return res.status(400).json({ error: 'HTML content is required' })

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process'],
      timeout: 60000,
    })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({
      format: 'A4', printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: '<div style="width:100%;font-size:9px;padding:5px 15px;color:#999;text-align:center;"><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>'
    })
    await browser.close()
    res.json({ success: true, pdf: pdfBuffer.toString('base64'), fileName })
  } catch (error) {
    console.error('PDF generation error:', error.message)
    res.status(500).json({ error: 'Failed to generate PDF', message: error.message })
  }
})

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'combined-seo-automation-service', version: '2.0.0' })
})

app.get('/', (req, res) => {
  res.json({
    service: 'SEO Automation Service', version: '2.0.0',
    endpoints: [
      { method: 'POST', path: '/crawl', description: 'Crawl a single page (axios → puppeteer fallback)' },
      { method: 'POST', path: '/crawl-blog', description: 'Crawl blog/article pages' },
      { method: 'POST', path: '/generate-pdf', description: 'Generate PDF from HTML' },
      { method: 'GET', path: '/health', description: 'Health check' }
    ]
  })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 SEO Automation Service v2.0 running on port ${PORT}`)
})