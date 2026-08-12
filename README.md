# Build Sequence — Ground Up

An interactive, decision-driven guide to constructing a building from site
assessment through handover. Built with React + Vite.

## License
MIT — see `LICENSE`. You're free to use, modify, and share this, with
attribution.

## Project structure

## Where the content lives (for editing later)
All of the actual construction content — stage names, checklist items,
common errors, decision options — lives in the `STAGES` array near the top
of `src/App.jsx`. To add or edit a stage, edit that array; you don't need
to touch the component logic below it.

## Not yet included (ideas for next steps)
- **Persistent storage** — right now all progress resets on page refresh.
  Wiring in save/load (browser storage or a backend) would let a user's
  checklist progress survive between visits.
- **Cost estimator** — the `weight` field on each stage (rough % of total
  build cost) is displayed but not yet turned into a running budget total.

## Deploy this for free (no coding required)

### Step 1 — Put this project on GitHub
1. Create a free account at https://github.com if you don't have one.
2. Click the "+" in the top right → "New repository". Name it
   `build-sequence` (or anything you like). Leave it Public. Click
   "Create repository".
3. On the new repo's page, click "uploading an existing file" and drag in
   every file and folder from this project (keep the folder structure —
   `src/` stays as a folder).
4. Click "Commit changes".

### Step 2 — Connect it to Vercel
1. Create a free account at https://vercel.com — choose "Continue with
   GitHub" so the two are linked automatically.
2. Click "Add New..." → "Project".
3. Select the `build-sequence` repository you just created and click
   "Import".
4. Vercel will auto-detect this as a Vite project. Leave all settings as
   default.
5. Click "Deploy".

That's it — in about a minute you'll get a live URL like
`build-sequence-yourname.vercel.app` that anyone can open. Every time you
update the GitHub repo afterward, Vercel automatically redeploys it.

### Alternative: Netlify
Same idea — https://netlify.com → "Add new site" → "Import an existing
project" → pick your GitHub repo → deploy. Build command: `npm run build`,
publish directory: `dist`.

## Running it locally (optional, if you get access to a coding environment)
