#!/bin/bash
# SuperAlive Studio API — Push to GitHub & Deploy to Vercel
# Just run: bash deploy.sh

echo "🚀 Pushing SuperAlive Studio API to GitHub..."

cd "$(dirname "$0")"

# Initialize git if needed
if [ ! -d .git ]; then
  git init
  git branch -M main
fi

# Add all files and commit
git add .
git commit -m "SuperAlive Studio API — 11 AI image generation workflows"

# Set remote and push
git remote remove origin 2>/dev/null
git remote add origin https://github.com/sandrinerose/superalive-api.git
git push -u origin main

echo ""
echo "✅ Code pushed to GitHub!"
echo "📦 Now go to https://vercel.com/new to deploy."
echo "   1. Select 'superalive-api' repo"
echo "   2. Add environment variables:"
echo "      GEMINI_API_KEY = your key"
echo "      REPLICATE_API_TOKEN = (add later)"
echo "      ALLOWED_ORIGINS = your Lovable URL"
echo "   3. Click Deploy!"
