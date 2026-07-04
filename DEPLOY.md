# Running & deploying SwiggOS

SwiggOS is a fully self-contained static web app — no build step, no install, no backend, no network calls. Everything runs in the browser; demo state lives in `localStorage`.

## 1. Run it locally (interview / offline demo)

**Fastest:** double-click `index.html` — it works straight from the file system in any modern browser.

**Nicer (clean URLs, no file:// quirks):** serve the folder with any static server, e.g.

```bash
cd swiggos
python3 -m http.server 8080
# then open http://localhost:8080
```

Demo tips:
- **Role switcher** (top right) — swap between AI Pioneer, Department Lead, Employee, Security Reviewer and Leadership to show RBAC and data-classification enforcement live.
- **Failure sim** (top bar) — flips the simulated backend into failure mode to show error/recovery states.
- **Reset data** — restores the seeded demo dataset at any time.

## 2. Put it on GitHub Pages (shareable live demo)

**Option A — upload via the GitHub website (no git needed):**
1. In your repo (e.g. `<you>.github.io`), click **Add file → Upload files**.
2. Drag the whole `swiggos` folder in and commit to your default branch.
3. Your live demo appears at `https://<you>.github.io/swiggos/` within a minute or two.

**Option B — merge the branch:** merge `claude/portswigger-ai-pioneer-app-rajgp5` into the default branch; Pages serves `/swiggos/` automatically.

No configuration is required either way — GitHub Pages serves the folder as-is (a Jekyll site copies it through untouched).

## 3. Any other static host

Netlify / Vercel / S3 / internal nginx: point it at the `swiggos` folder. There is nothing to build.

## Production path

See `README.md` → **"From demo to production"** for the real-backend plan (Postgres behind the `Store` seam, SSO/OIDC, append-only audit, gateway-fed observability).
