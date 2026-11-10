# Axiovo ProofLab

A free, open-source workspace for planning mathematical proofs and checking Lean 4 code.

## Browser workspace

Open `prooflab.html` from the Research Assistant. Create a theorem statement, list assumptions and proof obligations, and export the project as JSON or a Lean draft. Your text stays in your browser tab until you explicitly export it. The browser does not run Lean or automatically upload your project.

## Free local Lean verification

Install Lean 4 using the official Lean toolchain installer, elan, and create a Lean project with Mathlib if your proof imports Mathlib. Export the `.lean` file into your local Lean project, then run:

```sh
python scripts/prooflab_verify.py path/to/YourProof.lean
```

The checker invokes the installed Lean binary, captures diagnostics, and returns JSON. It reports **verified** only when Lean exits successfully and a simple admitted-proof check finds no `sorry` or `admit`. This is an initial safety check, not a proof provenance guarantee: imported axioms, unsafe declarations, and indirect admissions require additional auditing. Run only trusted Lean projects, since elaboration can involve executable metaprogramming. Never execute untrusted files as an unrestricted server service.

## Architecture

- **Browser:** free, static GitHub Pages interface and local project export
- **Local:** optional Ollama for draft generation and local Lean 4 for actual proof checking
- **Hosted:** optional future server, disabled by default and never necessary for the core workflow
- **Collaboration:** GitHub issues and pull requests today; structured proof-project sharing is planned

## Current scope

Proof planning, obligations, Lean draft export, and local command-line verification are implemented. Automatic proof synthesis, browser-to-local checker communication, persistent collaborative projects, and hosted verification are not yet implemented.
