-- Axiovo 3.0, migration 001: free, portable SQLite research index.
-- Compatible with standard SQLite FTS5 and Cloudflare D1 SQLite dialect.
-- Apply once to an empty database; migrations are tracked by the application.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS papers (
 id INTEGER PRIMARY KEY,
 source TEXT NOT NULL CHECK(source IN ('arxiv','biorxiv','chemrxiv')),
 source_id TEXT NOT NULL,
 canonical_key TEXT NOT NULL UNIQUE,
 title TEXT NOT NULL,
 abstract TEXT NOT NULL DEFAULT '',
 doi TEXT,
 first_submitted_at TEXT,
 metadata_updated_at TEXT,
 source_url TEXT NOT NULL,
 pdf_url TEXT,
 license TEXT,
 ingested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(source, source_id)
);
CREATE INDEX IF NOT EXISTS idx_papers_submitted ON papers(first_submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_papers_updated ON papers(metadata_updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_papers_doi ON papers(doi);
CREATE INDEX IF NOT EXISTS idx_papers_source_date ON papers(source, first_submitted_at DESC);

CREATE TABLE IF NOT EXISTS paper_versions (
 paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
 version TEXT NOT NULL,
 submitted_at TEXT,
 source_url TEXT,
 PRIMARY KEY(paper_id, version)
);
CREATE INDEX IF NOT EXISTS idx_versions_paper ON paper_versions(paper_id);

CREATE TABLE IF NOT EXISTS authors (
 id INTEGER PRIMARY KEY,
 name TEXT NOT NULL,
 normalized_name TEXT NOT NULL,
 orcid TEXT UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_authors_name ON authors(normalized_name);
CREATE TABLE IF NOT EXISTS paper_authors (
 paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
 author_id INTEGER NOT NULL REFERENCES authors(id),
 position INTEGER NOT NULL CHECK(position >= 0),
 PRIMARY KEY(paper_id, position),
 UNIQUE(paper_id, author_id)
);
CREATE INDEX IF NOT EXISTS idx_paper_authors_author ON paper_authors(author_id);

CREATE TABLE IF NOT EXISTS categories (
 id INTEGER PRIMARY KEY,
 source TEXT NOT NULL CHECK(source IN ('arxiv','biorxiv','chemrxiv')),
 source_code TEXT NOT NULL,
 display_name TEXT,
 UNIQUE(source,source_code)
);
CREATE TABLE IF NOT EXISTS paper_categories (
 paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
 category_id INTEGER NOT NULL REFERENCES categories(id),
 is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0,1)),
 PRIMARY KEY(paper_id,category_id)
);
CREATE INDEX IF NOT EXISTS idx_paper_categories_category ON paper_categories(category_id);

-- A DOI is an external identifier, NOT proof that two archive records are the
-- same work. Preserve source-specific paper identities and their provenance.
CREATE TABLE IF NOT EXISTS paper_identifiers (
 paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
 namespace TEXT NOT NULL,
 value TEXT NOT NULL,
 PRIMARY KEY(paper_id,namespace,value)
);
CREATE INDEX IF NOT EXISTS idx_identifiers_lookup ON paper_identifiers(namespace,value);

CREATE TABLE IF NOT EXISTS citation_edges (
 citing_paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
 cited_paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
 provider TEXT NOT NULL,
 retrieved_at TEXT NOT NULL,
 PRIMARY KEY(citing_paper_id,cited_paper_id,provider),
 CHECK(citing_paper_id != cited_paper_id)
);
CREATE INDEX IF NOT EXISTS idx_citations_target ON citation_edges(cited_paper_id);

CREATE TABLE IF NOT EXISTS ingestion_runs (
 run_id INTEGER PRIMARY KEY,
 source TEXT NOT NULL CHECK(source IN ('arxiv','biorxiv','chemrxiv')),
 started_at TEXT NOT NULL,
 finished_at TEXT,
 status TEXT NOT NULL CHECK(status IN ('running','success','partial','failed')),
 fetched_count INTEGER NOT NULL DEFAULT 0,
 accepted_count INTEGER NOT NULL DEFAULT 0,
 rejected_count INTEGER NOT NULL DEFAULT 0,
 error TEXT,
 checkpoint TEXT
);
CREATE INDEX IF NOT EXISTS idx_ingestion_runs_source ON ingestion_runs(source,started_at DESC);

CREATE TABLE IF NOT EXISTS coverage (
 source TEXT NOT NULL,
 scope TEXT NOT NULL DEFAULT 'recent-index',
 observed_count INTEGER NOT NULL DEFAULT 0,
 claimed_total INTEGER,
 last_success_at TEXT,
 status TEXT NOT NULL DEFAULT 'partial' CHECK(status IN ('partial','complete','unavailable')),
 explanation TEXT NOT NULL DEFAULT 'Indexed snapshot only; not a complete historical archive.',
 PRIMARY KEY(source,scope)
);

CREATE VIRTUAL TABLE IF NOT EXISTS papers_fts USING fts5(
 title,abstract,content='papers',content_rowid='id',tokenize='unicode61 remove_diacritics 2'
);
CREATE TRIGGER IF NOT EXISTS papers_ai AFTER INSERT ON papers BEGIN
 INSERT INTO papers_fts(rowid,title,abstract) VALUES(new.id,new.title,new.abstract);
END;
CREATE TRIGGER IF NOT EXISTS papers_ad AFTER DELETE ON papers BEGIN
 INSERT INTO papers_fts(papers_fts,rowid,title,abstract) VALUES('delete',old.id,old.title,old.abstract);
END;
CREATE TRIGGER IF NOT EXISTS papers_au AFTER UPDATE OF title,abstract ON papers BEGIN
 INSERT INTO papers_fts(papers_fts,rowid,title,abstract) VALUES('delete',old.id,old.title,old.abstract);
 INSERT INTO papers_fts(rowid,title,abstract) VALUES(new.id,new.title,new.abstract);
END;
