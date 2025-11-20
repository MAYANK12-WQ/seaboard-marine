# 🚀 STEP-BY-STEP SETUP GUIDE FOR BOSS

## Complete Installation Guide - Follow These Steps Exactly

---

## ✅ PREREQUISITES (Check These First)

### 1. Check if Node.js is installed
```bash
node --version
```
**Expected output:** v18.0.0 or higher (e.g., v18.17.0, v20.10.0)

**If NOT installed:**
- Go to: https://nodejs.org/
- Download "LTS" version (recommended)
- Install and restart terminal

### 2. Check if Git is installed
```bash
git --version
```
**Expected output:** git version 2.x.x

**If NOT installed:**
- Go to: https://git-scm.com/downloads
- Download and install
- Restart terminal

---

## 📥 STEP 1: DOWNLOAD THE CODE FROM GITHUB

### Option A: Using Git (Recommended)

Open Terminal/Command Prompt and run:

```bash
cd Desktop
```

```bash
git clone https://github.com/MAYANK12-WQ/seaboard-marine.git
```

```bash
cd seaboard-marine
```

**You should see:** "Cloning into 'seaboard-marine'..."

---

### Option B: Download ZIP (If Git not available)

1. Go to: https://github.com/MAYANK12-WQ/seaboard-marine
2. Click green "Code" button
3. Click "Download ZIP"
4. Extract ZIP to Desktop
5. Open Terminal/Command Prompt:

```bash
cd Desktop/seaboard-marine
```

---

## 📦 STEP 2: INSTALL DEPENDENCIES

Run this command (it will take 2-3 minutes):

```bash
npm install
```

**Expected output:**
```
added 345 packages, and audited 346 packages in 2m
```

**If you see errors:**
- Make sure you're inside the `seaboard-marine` folder
- Try: `npm install --legacy-peer-deps`

---

## 🔑 STEP 3: SETUP OPENAI API KEY

### Create the .env.local file:

**On Windows:**
```bash
copy .env.example .env.local
```

**On Mac/Linux:**
```bash
cp .env.example .env.local
```

### Edit the .env.local file:

**On Windows:**
```bash
notepad .env.local
```

**On Mac:**
```bash
open -e .env.local
```

**On Linux:**
```bash
nano .env.local
```

**Replace this line:**
```
OPENAI_API_KEY=your_api_key_here
```

**With your actual API key (I'll share this with you privately):**
```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
*Note: Replace with the actual API key I'll provide you*

**Save and close the file**
- Windows (Notepad): File → Save, then close
- Mac: Cmd+S, then Cmd+Q
- Linux: Ctrl+X, then Y, then Enter

---

## 🚀 STEP 4: RUN THE APPLICATION LOCALLY

Run this command:

```bash
npm run dev
```

**Expected output:**
```
▲ Next.js 16.0.3
- Local:        http://localhost:3000
- Environments: .env.local

✓ Starting...
✓ Ready in 2.3s
```

**Now open your browser and go to:**
```
http://localhost:3000
```

**You should see:** The RPG Documentation Generator interface

---

## 🧪 STEP 5: TEST THE APPLICATION

### Test 1: Upload a File
1. Click "📄 Upload .txt File(s)"
2. Select one or multiple .txt files
3. You should see: "✅ X files loaded successfully!"

### Test 2: Generate Documentation
1. Make sure RPG code is uploaded
2. Click "🚀 Generate Documentation"
3. Wait 5-10 seconds
4. You should see an alert with:
   - ⏱️ Time taken
   - 🔢 Tokens used (Input/Output)
   - 💰 Cost (e.g., $0.0234)
   - 🤖 Model: gpt-4o

### Test 3: Check Prompt Versioning
1. Click "Prompt History" tab
2. Edit and save a prompt
3. You should see: "📌 v1.0", "📌 v1.1", etc.

---

## ☁️ STEP 6: DEPLOY TO VERCEL (OPTIONAL)

### If boss wants to deploy to his own Vercel account:

### 6.1: Install Vercel CLI
```bash
npm install -g vercel
```

### 6.2: Login to Vercel
```bash
vercel login
```
**Follow the instructions to login via email**

### 6.3: Deploy
```bash
vercel
```

**Answer the questions:**
- Set up and deploy? **Y**
- Which scope? **Select your account**
- Link to existing project? **N**
- What's your project's name? **seaboard-marine** (or any name)
- In which directory is your code located? **./** (press Enter)
- Want to modify settings? **N**

### 6.4: Add Environment Variable
```bash
vercel env add OPENAI_API_KEY
```

**When prompted:**
- Enter the API key value
- Select: **Production**

### 6.5: Deploy to Production
```bash
vercel --prod
```

**You'll get a URL like:**
```
https://seaboard-marine-xyz123.vercel.app
```

---

## 🛠️ TROUBLESHOOTING

### Problem 1: Port 3000 already in use
**Error:** "Port 3000 is already in use"

**Solution:**
```bash
npm run dev -- -p 3001
```
Then open: http://localhost:3001

---

### Problem 2: Module not found
**Error:** "Cannot find module..."

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

### Problem 3: API Key Error
**Error:** "Valid OPENAI_API_KEY not configured"

**Solution:**
1. Check `.env.local` exists in project root
2. Check API key is correct (starts with `sk-proj-`)
3. Make sure no spaces before/after the key
4. Restart the dev server: `Ctrl+C` then `npm run dev`

---

### Problem 4: Git Clone Fails
**Error:** "Repository not found" or "Permission denied"

**Solution:**
- Use Option B (Download ZIP) instead
- Or make sure repository is public
- Or ask for repository access

---

## 📞 QUICK COMMAND REFERENCE

### To start the app:
```bash
cd seaboard-marine
npm run dev
```

### To stop the app:
Press `Ctrl+C` in terminal

### To build for production:
```bash
npm run build
```

### To check if everything is installed:
```bash
node --version
npm --version
git --version
```

---

## 🎯 WHAT TO TELL YOUR BOSS

### "Here's what you need to do:"

1. **Open Terminal/Command Prompt**
2. **Copy-paste these commands one by one:**

```bash
cd Desktop
git clone https://github.com/MAYANK12-WQ/seaboard-marine.git
cd seaboard-marine
npm install
```

3. **Create API key file:**
   - Windows: `copy .env.example .env.local`
   - Mac/Linux: `cp .env.example .env.local`

4. **Edit the file and add API key**
   - Windows: `notepad .env.local`
   - Mac: `open -e .env.local`

5. **Start the application:**
```bash
npm run dev
```

6. **Open browser:** http://localhost:3000

---

## ✅ SUCCESS CHECKLIST

- [ ] Node.js installed (v18+)
- [ ] Git installed
- [ ] Code downloaded from GitHub
- [ ] `npm install` completed successfully
- [ ] `.env.local` created with API key
- [ ] `npm run dev` running without errors
- [ ] Browser shows app at http://localhost:3000
- [ ] Can upload files
- [ ] Can generate documentation
- [ ] Can see cost in alert message

---

## 🔐 IMPORTANT SECURITY NOTES

1. **NEVER share the `.env.local` file** - It contains the secret API key
2. **NEVER commit `.env.local` to Git** - Already in .gitignore
3. **Set spending limits** in OpenAI dashboard: https://platform.openai.com/account/limits
4. **Monitor costs** regularly

---

## 💡 TIPS FOR THE CALL

### If boss is non-technical:

**Instead of saying:** "Clone the repository"
**Say:** "Download the code from GitHub"

**Instead of saying:** "Run npm install"
**Say:** "Install the dependencies - this downloads all the tools the app needs"

**Instead of saying:** "Environment variables"
**Say:** "Configuration file with your API key"

### Share your screen and:
1. Show him where to open Terminal/Command Prompt
2. Copy-paste commands for him (one by one)
3. Show him the `.env.local` file and where to paste the API key
4. Show him the app running in browser
5. Do a live test together

---

**Good luck with the setup call!** 🎉
