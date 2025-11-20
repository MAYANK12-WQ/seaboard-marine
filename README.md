# RPG Documentation Generator
## AI-Powered Legacy Code Documentation System

---

## 📖 **What This Application Does**

This application automatically converts old RPG (Report Program Generator) code into easy-to-understand documentation Think of it like a translator that reads complex technical code and writes simple English explanations.

### The Problem It Solves:
- Old RPG programs are difficult to understand
- Original developers may have left
- No documentation exists for legacy systems  
- Migrating to modern systems requires understanding old code

### The Solution:
- Upload your RPG code (image or text file)
- AI reads and analyzes the code
- Generates detailed documentation automatically
- Includes data flows, business rules, and technical specs

---

## ✨ **Key Features**

### 1. Multiple Input Methods
- 📸 Image Upload: Photo of printed code
- 📄 Text File Upload: Upload .txt files
- 📦 Multiple Files: Upload several files at once
- ⌨️ OCR: Reads text from images automatically

### 2. Customizable Documentation
- ✏️ Edit Prompt: Customize AI output
- 📌 Version Control: v1.0, v1.1, v1.2...
- 📜 History: See all past versions
- 💾 Auto-Save: Preferences saved automatically

### 3. Cost Tracking
- 💰 Real-Time Cost: See exact cost
- 🔢 Token Breakdown: Input/output tokens
- ⏱️ Time Tracking: Monitor duration
- 📊 Transparent Pricing: GPT-4o rates

---

## 🚀 **Quick Start**

### What You Need:
1. Node.js 18+ (https://nodejs.org/)
2. OpenAI API Key (https://platform.openai.com/)

### Installation:
```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env.local

# 3. Add your API key to .env.local
OPENAI_API_KEY=sk-your-key-here

# 4. Start the application
npm run dev

# 5. Open browser to http://localhost:3000
```

---

## 📱 **How to Use**

### Step 1: Upload RPG Code
- Click "📸 Upload Image" OR "📄 Upload .txt File(s)"
- Select your file(s)
- Code appears in the text area

### Step 2: (Optional) Customize Prompt
- Click "✏️ Edit Prompt"
- Modify instructions
- Click "💾 Save Prompt"

### Step 3: Generate
- Click "📄 Generate Code"
- Wait 5-30 seconds
- See cost, time, and tokens used

### Step 4: Use Documentation
- Click "📋 Copy" or "💾 Download"
- Documentation is ready to use

---

## 💰 **Cost Information**

### GPT-4o Pricing:
| Type | Cost per 1M Tokens | Per Document |
|------|-------------------|--------------|
| Input | $2.50 | $0.005-$0.020 |
| Output | $10.00 | $0.010-$0.050 |
| **Total** | - | **$0.015-$0.070** |

### Monthly Estimates:
- **Light** (10-50 docs): $0.50-$2.50
- **Medium** (100-500 docs): $5.00-$25.00  
- **Heavy** (1000+ docs): $50.00-$250.00

---

## 📁 **File Structure**

```
seaboard-marine/
├── app/
│   ├── api/generate/route.js    # AI logic (103 lines)
│   ├── page.js                  # UI (724 lines)
│   └── globals.css              # Styles
├── .env.local                   # API key (secret!)
├── package.json                 # Dependencies
└── README.md                    # This file
```

---

## 🔧 **Troubleshooting**

### "API Key Not Configured"
```bash
# Check if .env.local exists
ls .env.local

# Create if missing
cp .env.example .env.local

# Edit and add real key
OPENAI_API_KEY=sk-your-key-here
```

### "Module Not Found"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Port Already in Use
```bash
# Kill existing process
taskkill /F /IM node.exe  # Windows
killall node              # Mac/Linux

# Or use different port
PORT=3001 npm run dev
```

---

## 🎓 **Technology Explained**

### For Non-Technical Users:

**AI/GPT-4o**: Smart assistant that reads code and writes explanations

**Next.js**: Modern framework that makes the website fast and secure

**Vercel**: Cloud hosting that runs the app 24/7

**OCR**: Technology that reads text from images

**Tokens**: Units AI uses to process text (like word count)

---

## 📞 **Support**

### Getting Help:
1. Check this README first
2. Review code comments
3. OpenAI docs: https://platform.openai.com/docs
4. Next.js docs: https://nextjs.org/docs

### Maintenance:
- **Weekly**: Check costs and usage
- **Monthly**: Update dependencies (`npm update`)
- **Quarterly**: Update Next.js (`npm install next@latest`)

---

## ⚙️ **Configuration**

### Environment Variables (.env.local):
```env
# Required
OPENAI_API_KEY=sk-your-key-here

# Optional
# OPENAI_MODEL=gpt-4o  # Default model
```

### Adjusting AI Settings:
Edit `app/api/generate/route.js` (lines 45-59):
- **Temperature** (line 57): 0.0-1.0 (creativity)
- **Max Tokens** (line 58): Output length limit
- **Model** (line 46): Which AI to use

---

## 📊 **Version History**

| Version | Changes |
|---------|---------|
| 1.0 | Initial release |
| 1.1 | Multiple file upload |
| 1.2 | Cost tracking |
| 1.3 | Version control for prompts |

---

## ✅ **Features Checklist**

- [x] Image upload with OCR
- [x] Text file upload (single/multiple)
- [x] Customizable prompts
- [x] Version control (v1.0, v1.1...)
- [x] Prompt history
- [x] Cost tracking
- [x] Token breakdown
- [x] Time tracking
- [x] Copy to clipboard
- [x] Download as .txt
- [x] Search history
- [x] Export history
- [x] Auto-save preferences

---

## 🎯 **Best Practices**

1. **Review AI output** - Always verify before using
2. **Keep prompts clear** - Focused instructions work best
3. **Break large files** - Split very long programs
4. **Save good prompts** - Version control helps
5. **Track costs** - Monitor usage regularly
6. **Backup configs** - Save .env.local safely

---

## 🔒 **Security Notes**

- **Never share .env.local** - Contains your API key
- **.gitignore** prevents accidental commits
- **API keys** are private - treat like passwords
- **Backup safely** - Don't store keys in plain text
- **Regular updates** - Keep dependencies current

---

## 📝 **Important Notes**

This application uses AI which is very good but not perfect. Always have someone review generated documentation before using it for critical decisions.

The cost tracking shows real OpenAI charges. Monitor usage to control expenses.

Version control helps track prompt changes. Use it to find the best documentation format.

---

**Status**: Production Ready ✅  
**Version**: 1.3  
**Last Updated**: November 2025

For questions or issues, refer to the Troubleshooting section above.
