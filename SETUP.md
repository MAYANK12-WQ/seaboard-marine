# Seaboard Marine - Setup Instructions

## 🚀 Quick Start

### 1. Get Your Free Groq API Key

1. Go to [https://console.groq.com/](https://console.groq.com/)
2. Sign up for a free account (no credit card required)
3. Navigate to API Keys section
4. Click "Create API Key"
5. Copy your API key (starts with `gsk_...`)

**Free Tier Limits:**
- 14,400 requests per day
- 30 requests per minute
- More than enough for this application!

### 2. Configure Environment Variable

1. Open the file `.env.local` in the root directory
2. Replace `gsk_your_api_key_here` with your actual Groq API key:

```
GROQ_API_KEY=gsk_your_actual_api_key_here
```

3. Save the file

### 3. Install Dependencies & Run

```bash
npm install
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

---

## ✨ What Changed?

### Before (Hardcoded) ❌
- Output generated in <1 second
- Ignored the system prompt completely
- Used hardcoded pattern matching
- Always produced the same format regardless of prompt

### After (AI-Powered) ✅
- Output takes 5-10 seconds (real AI processing)
- **Actually follows the system prompt instructions**
- Uses Groq's Llama 3.3 70B model
- Output changes based on prompt modifications
- Real AI analysis of RPG code

---

## 🧪 How to Verify It's Working

1. **Upload RPG code** (image or text file)
2. **Click "Generate Code"**
3. **Watch the loading state** - should take 5-10 seconds
4. **Check the console logs** - you'll see:
   - 🚀 Starting AI-based documentation generation...
   - ✅ Documentation generated in X.XXs
   - 📊 Tokens used: XXXX
   - 🤖 Model: llama-3.3-70b-versatile

5. **Test prompt customization:**
   - Go to "Prompt History" tab
   - Edit the system prompt
   - Try changing instructions (e.g., "Add more security details")
   - Generate documentation again
   - Output should reflect your changes!

---

## 🔧 Troubleshooting

### Error: "GROQ_API_KEY not configured"
- Make sure `.env.local` exists in the root directory
- Check that the API key is correctly set
- Restart the dev server after changing .env.local

### Generation is too fast (<1 second)
- This means the AI integration isn't working
- Check the browser console for errors
- Verify `groq-sdk` is installed: `npm list groq-sdk`

### Error: "Rate limit exceeded"
- You've hit the free tier limit (30 requests/min)
- Wait a minute and try again
- Consider upgrading to Groq's paid tier if needed

---

## 📦 Deployment to Vercel

1. Add `GROQ_API_KEY` as an environment variable in Vercel:
   - Go to your Vercel project settings
   - Navigate to "Environment Variables"
   - Add: `GROQ_API_KEY` = `your_key_here`
   - Apply to Production, Preview, and Development

2. Redeploy your application

---

## 🎯 Key Features Now Working

✅ **Custom Prompt Support** - System actually follows your prompt
✅ **AI-Powered Analysis** - Real language model processing
✅ **Proper Loading States** - 5-10 second generation time
✅ **Token Tracking** - See how many tokens each generation uses
✅ **Error Handling** - Clear error messages for debugging
✅ **Prompt History** - Track all prompt changes
✅ **No Hardcoded Output** - Every generation is unique

---

## 💡 Tips

- **Keep prompts detailed** - The AI follows instructions better with clear, specific prompts
- **Test different models** - You can change the model in `route.js` (line 58)
- **Monitor token usage** - Each generation uses ~2000-6000 tokens depending on code size
- **Optimize for speed** - Reduce `max_tokens` in route.js if you want faster responses

---

## 🆘 Support

If you encounter issues:
1. Check the browser console (F12)
2. Check the terminal running `npm run dev`
3. Verify your Groq API key is valid
4. Make sure you have internet connection
