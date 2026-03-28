# Push to GitHub

Repository: https://github.com/reniil/atmosnet-io

## Step 1: Authenticate

Option A: Use GitHub CLI (recommended)
```bash
gh auth login
```

Option B: Use Personal Access Token
```bash
cd /home/ralph/.openclaw/workspace/atmosnet/backend
git remote set-url origin https://YOUR_TOKEN@github.com/reniil/atmosnet-io.git
git push -u origin master
```

## Step 2: Push

```bash
cd /home/ralph/.openclaw/workspace/atmosnet/backend
git push -u origin master
```

## Step 3: Verify

Go to: https://github.com/reniil/atmosnet-io

You should see all backend files.

## Step 4: Deploy to Render

1. Go to https://dashboard.render.com
2. Click "New Web Service"
3. Connect GitHub → Select `reniil/atmosnet-io`
4. Render will auto-detect `render.yaml`
5. Click "Create Web Service"

Your API will be live at: `https://atmosnet-api.onrender.com`
