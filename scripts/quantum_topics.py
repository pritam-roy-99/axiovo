"""Transparent, keyword-based multi-label quantum research topic classifier.

Labels are exploratory discovery aids, not verified scientific classifications.
"""
from __future__ import annotations
import re

TOPICS = {
    "quantum-communication": {
        "label": "Quantum communication & QKD",
        "patterns": [
            r"\b(?:di[- ]?qkd|qkd|quantum key distribution|quantum cryptograph\w*|quantum secure direct communication|qsd[c]?|device.independent key|secret.key rate|quantum secret sharing|quantum communication|teleportation protocol)\b"
        ],
    },
    "quantum-computing": {
        "label": "Quantum computing & algorithms",
        "patterns": [
            r"\b(?:quantum algorithm\w*|quantum computing|quantum computation|quantum advantage|quantum speedup|quantum circuit\w*|variational quantum|shor.s algorithm|grover.s algorithm|quantum complexity)\b"
        ],
    },
    "error-correction": {
        "label": "Quantum error correction",
        "patterns": [
            r"\b(?:error.correct\w*|surface codes?|stabilizer codes?|fault.toleran\w*|logical qubit\w*|quantum ldpc|syndrome measurement\w*|bosonic codes?)\b"
        ],
    },
    "foundations": {
        "label": "Quantum foundations & Bell tests",
        "patterns": [
            r"\b(?:bell inequalit\w*|bell nonlocal\w*|chsh|hidden.variable\w*|non.signall\w*|quantum foundation\w*|leggett.garg|loophole.free|quantum realism|operational non.disturbance)\b"
        ],
    },
    "entanglement-steering": {
        "label": "Entanglement & steering",
        "patterns": [
            r"\b(?:entangle\w*|quantum steering|epr steering|multipartite steering|assemblage\w*|schmidt number|genuine multipartite|witnessing entanglement|separable state\w*)\b"
        ],
    },
    "contextuality": {
        "label": "Contextuality & resources",
        "patterns": [
            r"\b(?:contextuali\w*|kochen.specker|parity.oblivious|random access code\w*|preparation noncontextual\w*|resource theor\w*)\b"
        ],
    },
    "optics-optomechanics": {
        "label": "Quantum optics & optomechanics",
        "patterns": [
            r"\b(?:optomechanic\w*|cavity qed|cavity quantum|photon\w*|quantum optic\w*|homodyne|squeezed light|interferomet\w*|mechanical oscillator\w*)\b"
        ],
    },
    "metrology": {
        "label": "Quantum sensing & metrology",
        "patterns": [
            r"\b(?:quantum metrolog\w*|quantum sens\w*|parameter estimat\w*|quantum fisher|fisher information|phase estimat\w*|precision bound\w*|magnetometr\w*)\b"
        ],
    },
    "open-systems": {
        "label": "Open systems & dynamics",
        "patterns": [
            r"\b(?:non.markov\w*|markovian\w*|open quantum system\w*|lindblad|decoheren\w*|quantum zen[o]?|dissipat\w*|amplitude damping|master equation\w*|quantum channel\w*|quantum dynamical)\b"
        ],
    },
    "networks": {
        "label": "Quantum networks & repeaters",
        "patterns": [
            r"\b(?:quantum network\w*|quantum repeater\w*|entanglement swapp\w*|network nonlocal\w*|network steering|distributed quantum|satellite quantum|quantum internet|bilocal\w*)\b"
        ],
    },
    "many-body": {
        "label": "Many-body physics & simulation",
        "patterns": [
            r"\b(?:many.body|quantum simulat\w*|spin chain\w*|tensor network\w*|matrix.product state\w*|topological phase\w*|phase transition\w*|many particle\w*|quantum lattice\w*)\b"
        ],
    },
    "hardware": {
        "label": "Qubits & hardware",
        "patterns": [
            r"\b(?:superconducting qubit\w*|trapped ion\w*|neutral.atom\w*|rydberg atom\w*|quantum processor\w*|transmon\w*|qubit device\w*|silicon spin qubit\w*|hardware benchmark\w*)\b"
        ],
    },
    "qmachine-learning": {
        "label": "Quantum machine learning",
        "patterns": [
            r"\b(?:quantum machine learning|quantum neural network\w*|quantum kernel\w*|quantum classifier\w*|qnn\b|quantum generative model\w*)\b"
        ],
    },
    "continuous-variables": {
        "label": "Continuous variables & CV",
        "patterns": [
            r"\b(?:continuous.variable\w*|gaussian state\w*|gaussian measurement\w*|wigner function\w*|bosonic mode\w*|quadrature squeez\w*)\b"
        ],
    },
    "thermodynamics": {
        "label": "Quantum thermodynamics",
        "patterns": [
            r"\b(?:quantum thermodynamic\w*|quantum heat engine\w*|work extract\w*|quantum battery\w*|entropy production|fluctuation theorem\w*|quantum thermal)\b"
        ],
    },
}

_COMPILED = {key: [re.compile(p, re.I) for p in item["patterns"]] for key,item in TOPICS.items()}

def assign_topics(paper, limit=5):
    """Multi-label text matching. Prioritize title mentions, limit excessive labels."""
    title = paper.get("title") or ""
    abstract = paper.get("abstract") or ""
    scores = []
    for key, patterns in _COMPILED.items():
        score = sum(3 if pat.search(title) else 0 for pat in patterns)
        score += sum(1 if pat.search(abstract) else 0 for pat in patterns)
        if score > 0:
            scores.append((score,key))
    scores.sort(key=lambda pair: (-pair[0], pair[1]))
    return [key for _,key in scores[:limit]]

def topic_catalog():
    return [{"id":key,"label":value["label"]} for key,value in TOPICS.items()]
