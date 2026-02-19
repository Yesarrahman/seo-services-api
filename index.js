const express = require('express')
const { CheerioCrawler } = require('crawlee')
const puppeteer = require('puppeteer')

const app = express()
app.use(express.json({ limit: '10mb' }))

// ============================================
// CRAWLEE ENDPOINTS (Web Scraping)
// ============================================

// Helper: extract SEO data from a cheerio or puppeteer page
function extractSEOFromCheerio($, url) {
  const title = $('title').text().trim()
  const metaDescription = $('meta[name="description"]').attr('content') || ''
  const h1 = $('h1').first().text().trim()
  const h2s = $('h2').map((i, el) => $(el).text().trim()).get()
  const bodyText = $('body').text()
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length
  const canonical = $('link[rel="canonical"]').attr('href') || ''
  let schema = null
  const schemaScripts = $('script[type="application/ld+json"]')
  if (schemaScripts.length > 0) {
    try { schema = JSON.parse($(schemaScripts[0]).html()) } catch (e) {}
  }
  const hostname = new URL(url).hostname
  const internalLinks = $('a[href^="/"], a[href*="' + hostname + '"]').length
  const externalLinks = Math.max(0, $('a[href^="http"]').length - internalLinks)
  return { url, title, metaDescription, h1, h2s, wordCount, canonical, schema, internalLinksCount: internalLinks, externalLinksCount: externalLinks }
}

// Helper: crawl with Puppeteer (for JS-rendered sites)
async function crawlWithPuppeteer(url, extractData) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  })
  try {
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    // Wait a bit for JS to render
    await new Promise(r => setTimeout(r, 2000))

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
      if (schemaEl) { try { schema = JSON.parse(schemaEl.innerText) } catch(e) {} }
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

// Crawl single page
app.post('/crawl', async (req, res) => {
  const { url, extractData = true } = req.body

  if (!url) {
    return res.status(400).json({ error: 'URL is required' })
  }

  try {
    let result = null
    let usedPuppeteer = false

    // Step 1: Try CheerioCrawler first (fast, lightweight)
    try {
      const cheerio = require('cheerio')
      const crawler = new CheerioCrawler({
        maxRequestsPerCrawl: 1,
        requestHandlerTimeoutSecs: 20,
        additionalMimeTypes: ['text/html'],
        async requestHandler({ request, $ }) {
          if (extractData) {
            result = extractSEOFromCheerio($, request.url)
          } else {
            result = { url: request.url, html: $.html() }
          }
        }
      })
      await crawler.run([url])
    } catch (e) {
      console.log('CheerioCrawler failed, will try Puppeteer:', e.message)
    }

    // Step 2: If Cheerio got no meaningful data (JS-rendered site), fall back to Puppeteer
    const isEmpty = !result || result.wordCount === 0 || (!result.h1 && (!result.h2s || result.h2s.length === 0))
    if (isEmpty) {
      console.log(`Cheerio returned empty for ${url}, falling back to Puppeteer...`)
      result = await crawlWithPuppeteer(url, extractData)
      usedPuppeteer = true
    }

    console.log(`Crawled ${url} via ${usedPuppeteer ? 'Puppeteer' : 'Cheerio'}: title="${result.title}", h1="${result.h1}", h2s=${result.h2s?.length}`)
    res.json(result)

  } catch (error) {
    console.error('Crawl error:', error)
    res.status(500).json({ error: 'Failed to crawl URL', message: error.message })
  }
})

// Crawl blog/article pages
app.post('/crawl-blog', async (req, res) => {
  const { url, extractArticles = true } = req.body

  if (!url) {
    return res.status(400).json({ error: 'URL is required' })
  }

  try {
    const articles = []

    const crawler = new CheerioCrawler({
      maxRequestsPerCrawl: 50,
      async requestHandler({ request, $ }) {
        // Find article links
        const articleLinks = $('a[href*="/blog/"], a[href*="/article/"], a[href*="/post/"]')
          .map((i, el) => $(el).attr('href'))
          .get()
          .filter(Boolean)
          .map(href => {
            // Convert relative URLs to absolute
            if (href.startsWith('/')) {
              const baseUrl = new URL(url)
              return `${baseUrl.protocol}//${baseUrl.host}${href}`
            }
            return href
          })
          .filter((href, index, self) => self.indexOf(href) === index) // Unique URLs
          .slice(0, 20) // Limit to 20 articles

        // Crawl each article
        for (const link of articleLinks) {
          try {
            const articleCrawler = new CheerioCrawler({
              maxRequestsPerCrawl: 1,
              async requestHandler({ request: articleRequest, $: article$ }) {
                const title = article$('h1').first().text().trim() || article$('title').text().trim()
                const h2s = article$('h2').map((i, el) => article$(el).text().trim()).get()
                
                // Extract keywords (simple frequency analysis)
                const bodyText = article$('article, main, .content, .post-content').text()
                const words = bodyText.toLowerCase().match(/\b\w{4,}\b/g) || []
                const wordFreq = {}
                words.forEach(word => {
                  if (!['this', 'that', 'with', 'from', 'have', 'been', 'were'].includes(word)) {
                    wordFreq[word] = (wordFreq[word] || 0) + 1
                  }
                })
                
                // Get top keywords
                const keywords = Object.entries(wordFreq)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {})
                
                // Published date (try to find)
                let publishedDate = null
                const dateEl = article$('time[datetime]')
                if (dateEl.length > 0) {
                  publishedDate = dateEl.attr('datetime')
                }
                
                const wordCount = bodyText.split(/\s+/).filter(Boolean).length

                articles.push({
                  url: articleRequest.url,
                  title,
                  h2s,
                  keywords,
                  publishedDate,
                  wordCount
                })
              }
            })
            
            await articleCrawler.run([link])
          } catch (e) {
            console.error(`Failed to crawl article ${link}:`, e)
          }
        }
      }
    })

    await crawler.run([url])
    res.json({ articles })
  } catch (error) {
    console.error('Blog crawl error:', error)
    res.status(500).json({ error: 'Failed to crawl blog', message: error.message })
  }
})

// ============================================
// PUPPETEER ENDPOINTS (PDF Generation)
// ============================================

// Generate PDF from HTML
app.post('/generate-pdf', async (req, res) => {
  const { html, fileName = 'report.pdf' } = req.body

  if (!html) {
    return res.status(400).json({ error: 'HTML content is required' })
  }

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    })

    const page = await browser.newPage()
    
    // Set HTML content
    await page.setContent(html, {
      waitUntil: 'networkidle0'
    })

    // Generate PDF with professional settings
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="width: 100%; font-size: 9px; padding: 5px 15px; color: #999; text-align: center;">
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `
    })

    await browser.close()

    // Return PDF as base64
    res.json({
      success: true,
      pdf: pdfBuffer.toString('base64'),
      fileName: fileName
    })

  } catch (error) {
    console.error('PDF generation error:', error)
    res.status(500).json({ 
      error: 'Failed to generate PDF', 
      message: error.message 
    })
  }
})

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'combined-seo-automation-service',
    endpoints: {
      crawl: 'POST /crawl',
      crawlBlog: 'POST /crawl-blog',
      generatePdf: 'POST /generate-pdf'
    }
  })
})

app.get('/', (req, res) => {
  res.json({
    service: 'SEO Automation Service',
    version: '1.0.0',
    endpoints: [
      { method: 'POST', path: '/crawl', description: 'Crawl a single page and extract SEO data' },
      { method: 'POST', path: '/crawl-blog', description: 'Crawl blog/article pages' },
      { method: 'POST', path: '/generate-pdf', description: 'Generate PDF from HTML' },
      { method: 'GET', path: '/health', description: 'Health check' }
    ]
  })
})

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 SEO Automation Service running on port ${PORT}`)
  console.log(`📊 Endpoints:`)
  console.log(`   POST /crawl - Web scraping`)
  console.log(`   POST /crawl-blog - Blog crawling`)
  console.log(`   POST /generate-pdf - PDF generation`)
  console.log(`   GET /health - Health check`)
})
