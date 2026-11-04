# Run ResearchLens on your own device

ResearchLens is a lightweight, installable web app. It does not require Node,
Docker, a database, or an account to use the basic reading workspace.

## Option A: Install from GitHub Pages (phone, tablet, or desktop)

1. Open https://pritam-roy-99.github.io/researchlens/ in a browser.
2. In Chrome for Android, open the browser menu and choose **Install app** or
   **Add to Home screen**, if offered. On desktop Chrome/Edge, use the browser's
   install option if shown.
3. Launch ResearchLens from your home screen or applications list.

Installation availability depends on the browser and platform. The interface
and cached app assets, including the last downloaded arXiv snapshot, can work offline, but **live arXiv/OpenAlex searches,
GitHub discussions, AI model downloads, and remote PDFs need a network**.
A browser-local reading list is saved in browser storage, so it does not
automatically synchronize with other browsers/devices.

## Option B: Run directly from GitHub (desktop)

Download the repo as a ZIP from GitHub, extract it, and run:

```bash
python3 run.py
```

On Windows, use `py run.py` if `python3` is not available.
Your browser opens automatically at a local `http://127.0.0.1:PORT/` URL.
Press Ctrl+C in the terminal to stop. No packages need installing.

Or, for a fixed port without opening a browser:

```bash
python3 run.py --port 8000 --no-browser
```

Do not open `docs/index.html` using a `file://` URL: browser security rules
prevent service workers and some fetch functionality from working reliably there.

## Privacy and AI

Saved papers and PDF notes stay in the browser unless you deliberately
configure and use a cloud service. Optional local AI through Ollama must be
installed and configured separately. A local HTTP server is **not** an AI backend.
The local server listens on loopback only and is not exposed to your network.

## Updating

If you downloaded a ZIP, download a new ZIP and replace the source files,
keeping the same browser origin/port if you want to retain browser-local data.
If you cloned with Git, run `git pull` before restarting.

## Developer smoke test

```bash
python3 -m unittest discover -s tests -v
python3 scripts/audit_internal_links.py
```
