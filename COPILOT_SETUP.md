# Litveyra Research Copilot

Live interface: https://pritam-roy-99.github.io/researchlens/copilot.html

## Features

- Ask questions in one of five modes: literature search, contribution comparison, technical explanation, reviewer checklist, research directions.
- Candidate retrieval from the current arXiv metadata snapshot; each source has a numbered, clickable link.
- Additional external OpenAlex searches for broader discovery. These source records do not become permanent Litveyra database entries.
- In evidence-only mode, you get an immediate deterministic source list without inference or GPU hardware.
- In local Ollama mode, you may use Qwen3.5 9B, 27B or 4B, running on a computer you control.
- An optional small Qwen2.5 WebGPU model runs directly in your browser after a substantial download.
- Conversation history stays in the current browser tab, not in an account or central store. Export it to a text file with source URLs.
- Enter an arXiv ID or open Copilot directly from a paper card. Draft abstracts or technical claims are optional and never sent to Litveyra servers.

## Preferred open-weight model

Qwen3.5 9B is a reasonable performance/resource starting point for local scientific reading assistance. Qwen3.5 27B provides more capacity but requires considerably more memory and compute. Neither model verifies mathematics automatically or proves originality. Independent benchmarking with quantum-information material is still needed.

Model catalog and install details: https://ollama.com/library/qwen3.5

## Local Ollama setup

1. Install Ollama: https://ollama.com/download
2. Download your preferred model with `ollama pull qwen3.5:9b` or `ollama pull qwen3.5:27b`.
3. **Allow the GitHub Pages origin**. Ollama normally restricts cross-origin requests. Stop the running Ollama service first, then restart it with `OLLAMA_ORIGINS=https://pritam-roy-99.github.io` in its environment. The exact restart procedure depends on your OS and service manager. Ollama's FAQ documents `OLLAMA_ORIGINS`: https://docs.ollama.com/faq
4. Confirm the local API is available at `http://127.0.0.1:11434/api/tags` on the same computer running your browser.
5. Open the Research Copilot, select "Local Qwen via Ollama", and click "Check local model connection".
6. Ask a research question. The Copilot sends your question, optional draft, and candidate abstracts to the **local Ollama process only**.

If your browser blocks the localhost request due to mixed-content, private-network-access, browser policy or cross-origin restrictions, this configuration may not work without a separately deployed secure proxy. Do not disable browser security protections. Do not make Ollama publicly reachable without authentication and transport security.

The public site does not hold model inference API keys, secret service credentials or a hosted GPU backend.

## Browser mode

WebLLM runs a smaller Qwen2.5 model using WebGPU and requires substantial hardware resources. Available model IDs are checked at runtime; if missing, the UI reports a failure and leaves evidence search available. The browser downloads model files from third-party servers. The model is for preliminary explanation, **not rigorous quantum-theorem comparison**.

## Retrieval methodology

Local results are ranked by query/title/abstract token frequencies and show the original arXiv URL. OpenAlex adds a separate broader metadata search. These are lightweight lexical or keyword retrieval methods, not embeddings, full-text parsing, citation-graph reasoning or verified theorem matching.

The Copilot includes source metadata in the generation prompt and requests numbered references. A model can still hallucinate or misattribute citations. **All generated reasoning remains unverified** until the researcher checks the full papers.

## Recommended next engineering milestones

1. Add a real scientific embedding pipeline (e.g., SPECTER2) and benchmark hybrid retrieval on hand-labeled quantum-information papers.
2. Index full historical arXiv metadata with incremental OAI-PMH harvesting and a proper persistent database.
3. Add citation-based expansion and stable paper-version graphs.
4. Evaluate model outputs against known literature and mathematical counterexamples.
5. Deploy a secured opt-in inference gateway if hosted AI is needed for visitors without local hardware.

All functionality described as local or optional remains local or optional until corresponding infrastructure is deployed.
