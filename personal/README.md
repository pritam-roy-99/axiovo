# Axiovo Personal: ChatGPT on your own Windows laptop

Axiovo Personal is an **optional, private, localhost-only** version of ProofLab. It runs at `http://127.0.0.1:4317/prooflab.html` on **your Windows computer**. It does **not** expose your ChatGPT connection on GitHub Pages.

It uses OpenAI's official [Sign in with ChatGPT DevKit](https://github.com/openai/sign-in-with-chatgpt-devkit), built locally. Eligible ChatGPT Plus or Pro account holders can authorize supported ChatGPT-plan AI requests without entering an API key. Inference is performed by OpenAI's cloud service; **this is not offline ChatGPT**. Ollama remains separately available for offline local inference.

## Install

Requirements: Windows 11, Git for Windows, Node.js **22.12 or newer**, and an internet connection for ChatGPT.

Open **PowerShell** (normal user, not administrator).

If the Axiovo repository is not on this laptop yet:

```powershell
cd "$HOME\Documents"
git clone --depth 1 --filter=blob:none --sparse https://github.com/pritam-roy-99/axiovo.git
cd axiovo
git sparse-checkout set docs personal
```

If the repository is already cloned, open it in PowerShell and run `git pull` after these changes are merged.

Start the private companion:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\personal\start.ps1
```

The startup script clones OpenAI's official DevKit into a **sibling folder** `sign-in-with-chatgpt-devkit`, installs its packages, and builds `@siwc/local`. It then runs `personal/server.mjs` and opens the local ProofLab page. First-time setup requires network access. Subsequent launches use the installed kit. Do not publish or sync the local credential directory.

If you prefer not to change PowerShell execution policy even for one process, review `personal/start.ps1` and run its commands manually. No administrator privileges are needed by Axiovo.

## Using ChatGPT in ProofLab

1. Open `http://127.0.0.1:4317/prooflab.html`. The page must use **127.0.0.1:4317**, not the public GitHub Pages URL.
2. In the left panel, find **ChatGPT · personal** and click **Continue with ChatGPT**.
3. Your default browser opens OpenAI authorization. Choose your ChatGPT account and **review and explicitly approve** the permitted scopes for ChatGPT-plan use.
4. Select a model **returned by your account**. No specific ChatGPT model is assumed or hardcoded.
5. Type your question in the **Proof conversation** composer.
6. Decide what context to send by checking the optional boxes for theorem statement, assumptions, Lean draft, or previous ChatGPT exchanges. **All are unchecked by default.**
7. Check **I approve sending this question and selected context to ChatGPT** and click **Ask ChatGPT**. You must approve every request separately.
8. ChatGPT's reply streams into the conversation. Nothing is a Lean-verified proof unless checked separately.

To make an entirely local AI request instead, use the existing Ollama controls. That method does not contact OpenAI.

## Controls

| Control | What it does |
|---|---|
| Continue with ChatGPT | Opens OpenAI's official OAuth consent in your browser |
| Context checkboxes | Specify exactly which Axiovo fields are sent |
| Request approval | Required again before **every** ChatGPT inference request |
| Ask ChatGPT | Sends only the current prompt plus approved context and optional prior ChatGPT chat history |
| Cancel generation | Cancels the current local ChatGPT request |
| Clear ChatGPT context | Clears only the in-memory ChatGPT conversation context for this tab |
| Disconnect ChatGPT | Revokes the active renewable session when supported and removes the local active authorization |
| Close PowerShell / Ctrl+C | Stops the entire localhost server and closes its API |
| ChatGPT usage settings | Review plan use, app permissions and limits at https://chatgpt.com/settings/usage |

No Axiovo session is uploaded to GitHub or to an Axiovo server. ChatGPT-approved question/context **does go to OpenAI for inference**. The static public site cannot authenticate to the local companion. The companion listens on IPv4 **127.0.0.1 only**, accepts API writes only with a same-origin request and an ephemeral anti-CSRF token, and refuses remote Host headers.

ChatGPT tokens are stored outside the repository, at `%LOCALAPPDATA%\AxiovoPersonal\chatgpt` (or the current user's AppData fallback), encrypted with Windows DPAPI for the current Windows user. The official DevKit refreshes and revokes sessions. The Node server never sends those tokens to the page. The Axiovo local chat context is held **only in browser memory** until the tab closes; no history is automatically persisted or included in later ChatGPT requests unless you opt in.

### What this doesn't do

- It does not reuse your ChatGPT browser cookies or extract passwords.
- It does not import prior ChatGPT conversations, memory, or files.
- It does not give ChatGPT remote control of your Windows desktop.
- It does not make ChatGPT work without internet.
- It does not guarantee unlimited ChatGPT requests; limits depend on your plan and account authorization.
- It does not verify mathematical proofs. Lean 4 checking must be run separately.

## Troubleshooting

- **No ChatGPT panel:** You opened the public `github.io` site instead of the local `127.0.0.1:4317` page, or the local server is not running.
- **Node version error:** Install Node 22.12 or later.
- **Sign-in fails:** Check that your browser opens `auth.openai.com`, your plan is eligible, and local loopback callbacks are not blocked. Review any error in the ChatGPT connection panel. Do not paste tokens into the browser console.
- **No models:** Your account has not authorized plan use or no supported models are available to that profile.
- **Request limit:** Visit ChatGPT Settings → Usage to review your plan's usage and app permissions.
- **Ollama remains available:** Use the independent local Ollama model selector and **Send to local AI**.

Official documentation: [Sign in with ChatGPT Quickstart](https://developers.openai.com/siwc/quickstart), [open-source DevKit](https://github.com/openai/sign-in-with-chatgpt-devkit), [credentials and sessions](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions).
