# Deployment Guide — LustraHair AI Try-On

This guide covers deploying the LustraHair AI Try-On application to **Vercel**.

---

## 1. Prerequisites

- A GitHub repository containing the LustraHair project code.
- A [Vercel](https://vercel.com) account.
- An [OpenRouter](https://openrouter.ai) API key (or Google Gemini API key).

---

## 2. Vercel Configuration Details

- **Framework Preset**: `Next.js` (auto-detected)
- **Root Directory**: `./` (or directory where `package.json` is located)
- **Build Command**: `next build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)
- **Custom `vercel.json`**: **Not required**. Next.js App Router and serverless routes are natively configured. Route timeout (`maxDuration = 60`) is declared directly in `src/app/api/try-on/route.ts`.

---

## 3. Step-by-Step Vercel Setup

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for production deployment"
   git push origin main
   ```

2. **Import Project into Vercel**:
   - Navigate to [vercel.com/new](https://vercel.com/new).
   - Select your repository and click **Import**.

3. **Configure Environment Variables**:
   Under **Environment Variables**, add the following:

   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `AI_PROVIDER` | `openrouter` | Or `gemini` or `demo` |
   | `OPENROUTER_API_KEY` | `sk-or-v1-...` | Your secret OpenRouter key |
   | `OPENROUTER_MODEL` | `google/gemini-3.1-flash-image` | Model name on OpenRouter |
   | `OPENROUTER_MAX_TOKENS` | `2048` | Optional token cap |

4. **Deploy**:
   - Click **Deploy**.
   - Vercel will run the production build and generate your live deployment URL.

---

## 4. Verification After Deployment

1. Open your live Vercel URL (e.g. `https://lustra-hair.vercel.app`).
2. Verify the landing page loads cleanly with Before/After hero visual.
3. Click **Try It Now** and upload a photo.
4. Select a look & shade, then click **Try This Look**.
5. Confirm the interactive Before/After comparison displays your uploaded photo on the left and the AI-generated look on the right.
