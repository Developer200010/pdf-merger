# Free PDF Merger

A free, browser-only PDF merger built with Next.js and `pdf-lib`. No files are
ever uploaded to a server — everything happens locally in the visitor's
browser, so it costs nothing to run and there are no privacy concerns.

Built for the Digital Heroes developer trial task.

## Before you deploy

Open `app/page.js` and edit these two lines with your real details:

```js
const YOUR_NAME = "Your Full Name";
const YOUR_EMAIL = "your.email@example.com";
```

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## Deploy for free (GitHub + Vercel)

1. Create a new **public** GitHub repo and push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: PDF merger"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. Go to https://vercel.com, sign in with GitHub (free, no card required).
3. Click **Add New → Project**, select this repo.
4. Framework preset "Next.js" is auto-detected — leave all settings as default.
5. Click **Deploy**. In under a minute you'll get a live `.vercel.app` URL.

That's it — no paid plan, no card, ever needed for this project.

## How it works

- Files are read in the browser with the File API.
- `pdf-lib` loads each PDF, copies its pages, and appends them to one merged
  document — all client-side, in memory.
- The result is turned into a Blob and offered as a direct download link.
