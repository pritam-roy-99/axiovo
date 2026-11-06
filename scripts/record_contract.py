"""Canonical source identity and metadata contract for Axiovo index v2.

This validation is independent of transport and browser storage. It never
infers unverified revisions, archive coverage, or authors from titles.
"""
from __future__ import annotations

from datetime import date
import re
from urllib.parse import unquote, urlsplit

_ARXIV = re.compile(r"^(?P<base>(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z]{2})?/\d{7}))(?:v(?P<version>[1-9]\d*))?$", re.I)
_DOI = re.compile(r"^10\.\d{4,9}/[-a-z0-9._;()/:+]+$", re.I)
_VALID_SOURCES = ("arxiv", "biorxiv", "chemrxiv")


class InvalidRecord(ValueError):
    """Source metadata cannot establish the minimum publication identity."""


def plain(value):
    return " ".join(str(value or "").split())


def arxiv_id(value):
    raw = plain(value)
    if raw.startswith(("http://", "https://")):
        url = urlsplit(raw)
        if url.hostname not in {"arxiv.org", "www.arxiv.org"}:
            raise InvalidRecord("arxiv_host")
        raw = unquote(url.path)
    raw = re.sub(r"^/(?:abs|pdf)/", "", raw).removesuffix(".pdf").lstrip("/")
    match = _ARXIV.fullmatch(raw)
    if not match:
        raise InvalidRecord("invalid_arxiv_id")
    number = int(match["version"]) if match["version"] else None
    if number is not None and number > 9999:
        raise InvalidRecord("invalid_arxiv_version")
    return match["base"], number


def doi_id(value):
    raw = plain(value)
    if raw.startswith(("http://", "https://")):
        url = urlsplit(raw)
        if url.hostname not in {"doi.org", "dx.doi.org", "www.doi.org"}:
            raise InvalidRecord("doi_host")
        raw = unquote(url.path).lstrip("/")
    raw = re.sub(r"^(?:doi:)", "", raw, flags=re.I).strip().lower()
    if not _DOI.fullmatch(raw):
        raise InvalidRecord("invalid_doi")
    return raw


def day(value):
    raw = plain(value)
    if not raw:
        return None
    try:
        return date.fromisoformat(raw[:10]).isoformat()
    except ValueError:
        return None


def revision(value):
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        raise InvalidRecord("invalid_version")
    try:
        n = int(value)
    except (ValueError, TypeError):
        raise InvalidRecord("invalid_version") from None
    if str(n) != str(value).strip() or not 1 <= n <= 9999:
        raise InvalidRecord("invalid_version")
    return n


def normalize_record(source, raw, *, provider, checked_at=None, source_record=None):
    """Return one verified-source *metadata identity*, or reject the record.

    Verification here means source shape/identifier provenance has passed the
    adapter. It does NOT mean the abstract's scientific claims were verified.
    """
    source = plain(source).lower()
    if source not in _VALID_SOURCES:
        raise InvalidRecord("unknown_source")
    if not isinstance(raw, dict) or not plain(raw.get("title")):
        raise InvalidRecord("missing_title")
    if not plain(provider):
        raise InvalidRecord("missing_provider")
    original_id = raw.get("recordId") or raw.get("arxiv_id") or raw.get("id")
    explicit = revision(raw.get("version"))
    doi = None
    if source == "arxiv":
        base, suffix = arxiv_id(original_id)
        if suffix is not None and explicit is not None and suffix != explicit:
            raise InvalidRecord("conflicting_arxiv_versions")
        version = suffix if suffix is not None else explicit
        identity = "arxiv:" + base
        source_id = base
        exact = base + (f"v{version}" if version else "")
        landing = f"https://arxiv.org/abs/{exact}"
        pdf = f"https://arxiv.org/pdf/{exact}"
        if raw.get("doi") or raw.get("DOI"):
            doi = doi_id(raw.get("doi") or raw.get("DOI"))
    else:
        doi = doi_id(raw.get("doi") or raw.get("DOI") or original_id)
        if source == "biorxiv" and not doi.startswith(("10.1101/", "10.64898/")):
            raise InvalidRecord("wrong_biorxiv_prefix")
        if source == "chemrxiv" and not doi.startswith("10.26434/chemrxiv"):
            raise InvalidRecord("wrong_chemrxiv_prefix")
        version = explicit
        source_id = doi
        identity = source + ":" + doi
        landing = ("https://www.biorxiv.org/content/" + doi +
                   (f"v{version}" if version else "")) if source == "biorxiv" else "https://doi.org/" + doi
        pdf = landing + ".full.pdf" if source == "biorxiv" else None

    raw_authors = raw.get("authors") or []
    if isinstance(raw_authors, str):
        raw_authors = [p.strip() for p in raw_authors.split(";") if p.strip()]
    if not isinstance(raw_authors, list):
        raise InvalidRecord("invalid_authors")
    people = []
    for author in raw_authors[:150]:
        if isinstance(author, str):
            name, orcid = plain(author), None
        elif isinstance(author, dict):
            name, orcid = plain(author.get("name")), author.get("orcid")
        else:
            raise InvalidRecord("invalid_author")
        if name:
            people.append({"name": name, "orcid": orcid if isinstance(orcid, str) and orcid else None})

    categories = raw.get("categories") or []
    if isinstance(categories, str):
        categories = [categories]
    if not isinstance(categories, list):
        raise InvalidRecord("invalid_categories")
    cats = list(dict.fromkeys(plain(v) for v in categories if plain(v)))
    primary = plain(raw.get("primary_category") or raw.get("category"))
    if primary and primary not in cats:
        cats.insert(0, primary)

    submitted = day(raw.get("submitted_date") or raw.get("published") or
                    raw.get("created") or raw.get("date"))
    announced = day(raw.get("announcement_date") or raw.get("announced_date"))
    updated = day(raw.get("updated_date") or raw.get("updated"))
    return {
        "schema_version": 2, "id": identity, "source": source,
        "source_id": source_id, "version": version, "title": plain(raw["title"]),
        "authors": people, "abstract": plain(raw.get("abstract") or raw.get("summary")),
        "categories": cats, "submitted_date": submitted,
        "announced_date": announced, "updated_date": updated,
        "doi": doi, "journal_ref": plain(raw.get("journal_ref") or raw.get("journal-ref")) or None,
        "landing_url": landing, "pdf_url": pdf,
        "provenance": {"provider": plain(provider), "checked_at": checked_at,
                       "source_record": source_record},
        "validation": {"identity_verified": True, "metadata_status": "verified",
                       "warnings": []}
    }


def revision_key(record):
    return (record["id"], record["version"])


def choose_same_revision(a, b):
    """Prefer a richer *same revision* without transferring unknown claims."""
    if revision_key(a) != revision_key(b):
        raise InvalidRecord("cross_revision_merge")
    def quality(p):
        return (bool(p.get("abstract")), len(p.get("abstract") or ""),
                len(p.get("authors") or []), len(p.get("categories") or []))
    return a if quality(a) >= quality(b) else b
