# ⚡ QUICK START - Deploy to Render in 5 Minutes

## 🎯 What This Does

This **single service** replaces both:
- ❌ Crawlee Service (Port 3000)
- ❌ Puppeteer PDF Service (Port 3001)

With:
- ✅ Combined Service (Port 3000) - All endpoints

**Perfect for Render Free Tier!**

---

## 🚀 Deploy Now (5 Steps)

### Step 1: Create GitHub Repo (2 min)

```bash
# In the combined-service folder
git init
git add .
git commit -m "SEO Automation Service"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/seo-service.git
git push -u origin main
```

### Step 2: Sign Up for Render (1 min)

- Go to https://render.com
- Sign up with GitHub (free)

### Step 3: Create Web Service (1 min)

1. Click **"New +"** → **"Web Service"**
2. Connect GitHub repo
3. Select your repository
4. Click **"Connect"**

### Step 4: Configure (30 sec)

Render auto-detects settings, just verify:

```
Name: seo-automation-service
Environment: Docker ✅ (auto-detected)
Region: Your closest region
Branch: main
Plan: Free ✅
```

Click **"Create Web Service"**

### Step 5: Wait for Deploy (5 min)

Render will:
1. Build Docker image ⏳
2. Install dependencies ⏳
3. Start service ✅

**Done!** Your service is live.

---

## 📋 Get Your Service URL

After deployment, Render gives you:

```
https://seo-automation-service.onrender.com
```

**Copy this URL!**

---

## 🧪 Test It Works

### Quick Test in Browser:

Visit:
```
https://YOUR_SERVICE.onrender.com/health
```

Should see:
```json
{
  "status": "ok",
  "service": "combined-seo-automation-service"
}
```

✅ **It's alive!**

---

## 🔧 Update n8n Workflows

### You need to update 3 workflows:

**1. Competitor Crawler (Workflow 2)**

Find the HTTP Request node:
```json
Old: "url": "http://crawlee-service:3000/crawl"
New: "url": "https://YOUR_SERVICE.onrender.com/crawl"
```

**2. Content Gap Finder (Workflow 3)**

Find the HTTP Request node:
```json
Old: "url": "http://crawlee-service:3000/crawl-blog"
New: "url": "https://YOUR_SERVICE.onrender.com/crawl-blog"
```

**3. Report Generator (Workflow 4)**

Find the HTTP Request node:
```json
Old: "url": "http://puppeteer-service:3001/generate-pdf"
New: "url": "https://YOUR_SERVICE.onrender.com/generate-pdf"
```

---

## ✅ You're Done!

Your workflows now use the **FREE** Render service instead of separate deployments.

---

## ⚠️ Important: Free Tier Behavior

**Render Free Tier:**
- Spins down after 15 min of inactivity
- First request wakes it up (~30 sec delay)
- Then it's fast

**For weekly SEO automation:** This is PERFECT ✅
- Workflows run once/week
- 30 sec wake-up is fine
- Saves you $10-20/month

**Want faster?** Upgrade to $7/mo (no spin-down)

---

## 🎯 What's Next?

1. ✅ Service deployed on Render
2. ✅ n8n workflows updated
3. ✅ Test a workflow manually
4. ✅ Schedule automations

**Your SEO automation is LIVE!** 🎉

---

## 💡 Pro Tips

### Keep Service Awake (Optional)

Use UptimeRobot (free):
1. Sign up at https://uptimerobot.com
2. Add monitor for your service URL
3. Ping every 5 minutes
4. Keeps service awake ✅

### View Logs

In Render dashboard:
- Click your service
- Go to "Logs" tab
- See real-time activity

### Redeploy

Push to GitHub:
```bash
git add .
git commit -m "Updated"
git push
```

Render auto-deploys! ✅

---

## 🆘 Troubleshooting

**Service won't start?**
- Check Render logs
- Verify Dockerfile syntax
- Ensure package.json is correct

**n8n can't connect?**
- Check service is running (green in Render)
- Verify URL has no typos
- Test /health endpoint first

**Slow first request?**
- Normal for free tier
- Service is waking up
- Use UptimeRobot to keep awake

---

**Questions?** Check README.md for detailed docs.

**Happy automating!** 🚀
