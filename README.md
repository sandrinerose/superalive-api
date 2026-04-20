# SuperAlive Studio API

**SuperAlive Studio** — 11 AI image generation workflows powered by Gemini 2.5 Pro + Replicate Flux.

This is the API backend that powers your Lovable frontend. Each workflow from the Avatar Pipeline Bible is available as a simple POST endpoint.

---

## Quick Start

### 1. Get your API keys

- **Gemini**: https://aistudio.google.com/apikey (free tier available)
- **Replicate**: https://replicate.com/account/api-tokens (pay-as-you-go)

### 2. Set up the project

```bash
# Clone or download the SuperAlive API folder
cd flora-api

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local and add your API keys
```

### 3. Run locally

```bash
npm run dev
# → API running at http://localhost:3000
```

### 4. Deploy to Vercel (free)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add your environment variables in the Vercel dashboard:
# GEMINI_API_KEY, REPLICATE_API_TOKEN, ALLOWED_ORIGINS
```

---

## API Endpoints

Every endpoint accepts `POST` with a JSON body. All return:

```json
{
  "success": true,
  "workflow": "Workflow Name",
  "images": ["https://...url-to-generated-image.png"],
  "enhancedPrompt": "The enhanced prompt that was sent to Flux",
  "candidateCount": 4
}
```

### Endpoint Reference

| Endpoint | Workflow | Required Fields |
|----------|----------|----------------|
| `POST /api/face-grid` | Face Grid | `prompt`, `images[0]` (hero portrait) |
| `POST /api/body-grid` | Body Grid | `prompt`, `images[0]` (face grid) |
| `POST /api/faceswap` | Faceswap | `prompt`, `images[0]` (face), `images[1]` (scene) |
| `POST /api/image-generation` | Image Gen | `prompt`, optional `images[]` |
| `POST /api/edit-image` | Edit Image | `prompt`, `images[0]` (image to edit) |
| `POST /api/sketch-to-render` | Sketch to Render | `prompt`, `images[0]` (sketch) |
| `POST /api/product-integration` | Product Integration | `prompt`, `images[0]` (base), `images[1]` (product) |
| `POST /api/upscaler` | 4K Upscaler | `images[0]` (image to upscale) |
| `POST /api/aspect-ratio` | Aspect Ratio | `images[0]`, `ratios[]` (e.g., `["16:9", "9:16"]`) |
| `POST /api/fashion-master` | Fashion Master | `prompt`, `images[0]`, `mode` (flat-lay/try-on/multi-angle) |
| `POST /api/variations` | Variations | `prompt`, `images[0]`, `mode` (multi-angle/action) |

### Request Body Format

```json
{
  "prompt": "24-year-old Brazilian woman, warm brown skin, dark curly hair...",
  "images": ["base64-encoded-image-data-here"],
  "imageMediaTypes": ["image/jpeg"],
  "aspectRatio": "1:1",
  "candidates": 4,
  "model": "flux-2-dev"
}
```

**Images**: Send as base64-encoded strings (no `data:image/...` prefix — just the raw base64).

**Optional fields**: `aspectRatio`, `candidates`, `model` all have sensible defaults per workflow.

---

## Connecting to Lovable

In your Lovable frontend, call the API like this:

```javascript
// Example: Image Generation
const response = await fetch("https://your-api.vercel.app/api/image-generation", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: "A futuristic cityscape at golden hour, cinematic lighting",
    aspectRatio: "16:9",
    candidates: 4,
  }),
});

const data = await response.json();
// data.images = ["https://...generated-image-1.png", "https://...2.png", ...]
```

```javascript
// Example: Face Grid (with image upload)
const toBase64 = (file) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result.split(",")[1]);
  reader.readAsDataURL(file);
});

const imageBase64 = await toBase64(fileInput.files[0]);

const response = await fetch("https://your-api.vercel.app/api/face-grid", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: "24-year-old woman, brown eyes, curly hair",
    images: [imageBase64],
    imageMediaTypes: ["image/jpeg"],
  }),
});
```

### CORS

Set `ALLOWED_ORIGINS` in your Vercel environment variables to your Lovable domain:
```
ALLOWED_ORIGINS=https://your-site.lovable.app
```

---

## Cost per call

| Workflow | Est. cost |
|----------|-----------|
| Image Generation (text only) | ~$0.02 |
| Face Grid / Body Grid / Faceswap | ~$0.07–0.10 |
| Edit Image / Sketch to Render | ~$0.07–0.10 |
| 4K Upscaler | ~$0.02–0.04 |
| Aspect Ratio (per ratio) | ~$0.02–0.04 |
| Fashion Master / Variations | ~$0.07–0.15 |

---

Built by SuperAlive Studio. System prompts from the SuperAlive Studio Avatar Pipeline Bible v3.0.
