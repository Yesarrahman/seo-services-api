# 🚀 Combined SEO Automation Service

**One service with everything:**
- ✅ Web scraping (Crawlee)
- ✅ PDF generation (Puppeteer)
- ✅ Single deployment
- ✅ Perfect for Render free tier

---

## 📦 What's Included

**3 Endpoints:**

1. **POST /crawl** - Scrape single page
2. **POST /crawl-blog** - Scrape blog articles
3. **POST /generate-pdf** - Generate PDF from HTML

**1 Port:** Everything runs on port 3000 (or Render's PORT)

---

## 🎯 Deploy to Render (FREE!)

### Step 1: Create GitHub Repository

```bash
# In this folder (combined-service)
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/seo-service.git
git push -u origin main
```

### Step 2: Deploy on Render

1. Go to https://render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:

```
Name: seo-automation-service
Environment: Docker
Region: Choose closest to you
Instance Type: Free
```

5. Click **"Create Web Service"**

### Step 3: Wait for Deployment

Render will:
- ✅ Pull your code
- ✅ Build Docker image
- ✅ Install Chrome + dependencies
- ✅ Start the service

Takes ~5-10 minutes first time.

### Step 4: Get Your Service URL

Render gives you a URL like:
```
https://seo-automation-service.onrender.com
```

**Save this URL!** You'll use it in n8n.

---

## 🧪 Test Your Deployment

### Test 1: Health Check

```bash
curl https://YOUR_SERVICE.onrender.com/health
```

Should return:
```json
{
  "status": "ok",
  "service": "combined-seo-automation-service",
  "endpoints": {
    "crawl": "POST /crawl",
    "crawlBlog": "POST /crawl-blog",
    "generatePdf": "POST /generate-pdf"
  }
}
```

### Test 2: Crawl a Page

```bash
curl -X POST https://YOUR_SERVICE.onrender.com/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### Test 3: Generate PDF

```bash
curl -X POST https://YOUR_SERVICE.onrender.com/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{"html": "<h1>Test PDF</h1><p>This works!</p>"}'
```

---

## 🔧 Configure n8n Workflows

### In ALL workflows, update these URLs:

**Competitor Crawler Workflow:**
```
OLD: http://crawlee-service:3000/crawl
NEW: https://YOUR_SERVICE.onrender.com/crawl
```

**Content Gap Finder Workflow:**
```
OLD: http://crawlee-service:3000/crawl-blog
NEW: https://YOUR_SERVICE.onrender.com/crawl-blog
```

**Report Generator Workflow:**
```
OLD: http://puppeteer-service:3001/generate-pdf
NEW: https://YOUR_SERVICE.onrender.com/generate-pdf
```

### Quick Find & Replace in n8n:

1. Open each workflow
2. Find HTTP Request nodes
3. Update URL to your Render URL
4. Save workflow

---

## 📊 API Reference

### 1. Crawl Single Page

**Endpoint:** `POST /crawl`

**Request:**
```json
{
  "url": "https://competitor.com/page",
  "extractData": true
}
```

**Response:**
```json
{
  "url": "https://competitor.com/page",
  "title": "Page Title",
  "metaDescription": "Meta description...",
  "h1": "Main Heading",
  "h2s": ["Subheading 1", "Subheading 2"],
  "wordCount": 1234,
  "canonical": "https://competitor.com/page",
  "schema": {...},
  "internalLinksCount": 45,
  "externalLinksCount": 12,
  "html": "<html>..."
}
```

### 2. Crawl Blog Articles

**Endpoint:** `POST /crawl-blog`

**Request:**
```json
{
  "url": "https://competitor.com/blog"
}
```

**Response:**
```json
{
  "articles": [
    {
      "url": "https://competitor.com/blog/post-1",
      "title": "Article Title",
      "h2s": ["Section 1", "Section 2"],
      "keywords": {
        "keyword1": 15,
        "keyword2": 10
      },
      "publishedDate": "2024-01-01",
      "wordCount": 2000
    }
  ]
}
```

### 3. Generate PDF

**Endpoint:** `POST /generate-pdf`

**Request:**
```json
{
  "html": "<html><body><h1>Report</h1></body></html>",
  "fileName": "report.pdf"
}
```

**Response:**
```json
{
  "success": true,
  "pdf": "base64EncodedPDFString...",
  "fileName": "report.pdf"
}
```

---

## ⚠️ Render Free Tier Limitations

**Important Notes:**

1. **Spins down after 15 minutes of inactivity**
   - First request after spin-down takes ~30 seconds
   - Subsequent requests are fast
   
2. **750 hours/month free**
   - More than enough for automated workflows
   
3. **Auto-deploys on git push**
   - Push to GitHub → Render auto-deploys
   
4. **Environment variables**
   - Set in Render dashboard if needed

**Solutions for spin-down:**

**Option A:** Use a cron job to ping it
```bash
# Add to cron (every 10 minutes)
*/10 * * * * curl https://YOUR_SERVICE.onrender.com/health
```

**Option B:** Use a service like UptimeRobot (free)
- Pings your service every 5 minutes
- Keeps it awake

**Option C:** Upgrade to paid ($7/mo)
- No spin-down
- Faster performance

---

## 🔄 Update Your Service

**Make changes:**
```bash
# Edit index.js
nano index.js

# Commit and push
git add .
git commit -m "Updated service"
git push
```

**Render auto-deploys!** ✅

---

## 🐛 Troubleshooting

### Service won't start

**Check Render logs:**
- Go to Render dashboard
- Click your service
- Check "Logs" tab

**Common issues:**
- Chrome dependencies missing (should be in Dockerfile)
- Port not set correctly (Render sets PORT env variable)

### Puppeteer fails

**Error:** "Failed to launch browser"

**Solution:** Already fixed in Dockerfile with:
```dockerfile
--no-sandbox
--disable-setuid-sandbox
--disable-dev-shm-usage
```

### n8n can't reach service

**Check:**
- Service is running (green in Render dashboard)
- URL is correct in n8n workflows
- No typos in endpoint paths

---

## 💰 Cost Comparison

### Before (Separate Services)

| Service | Platform | Cost |
|---------|----------|------|
| Crawlee | Railway | $5/mo |
| Puppeteer | Railway | $5/mo |
| **Total** | | **$10/mo** |

### After (Combined Service)

| Service | Platform | Cost |
|---------|----------|------|
| Combined | Render Free | **$0/mo** |
| **Total** | | **$0/mo** ✅ |

**You save $120/year!**

Or upgrade to Render paid ($7/mo) for:
- No spin-down
- Better performance
- Still save $3/mo vs separate services

---

## 🎯 Architecture

```
n8n Workflows (Your Server)
         ↓
         ↓ HTTPS
         ↓
Render Free Tier (Combined Service)
         ├── /crawl (Crawlee)
         ├── /crawl-blog (Crawlee)
         └── /generate-pdf (Puppeteer)
```

**All in one container!** ✅

---

## 📝 Next Steps

1. ✅ Deploy to Render
2. ✅ Get service URL
3. ✅ Update n8n workflows
4. ✅ Test each endpoint
5. ✅ Run your first automation!

---

## 🆘 Need Help?

**Render Documentation:**
- https://render.com/docs/deploy-node-express-app

**Test locally first:**
```bash
npm install
npm start
# Test on http://localhost:3000
```

**Common commands:**
```bash
# View logs
render logs

# Restart service (in Render dashboard)
# Settings → Manual Deploy → Deploy latest commit
```

---

**Your service is ready to deploy!** 🚀

Just push to GitHub and deploy on Render - it's that simple!
