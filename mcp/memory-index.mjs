function tokenize(query) {
  return [...new Set(String(query).toLowerCase().match(/[a-z0-9][a-z0-9_-]*/g) ?? [])];
}

function normalizeKind(value) {
  return String(value ?? "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function makeExcerpt(text, terms, maxLength = 420) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  const lower = normalized.toLowerCase();
  let index = terms.reduce((best, term) => {
    const found = lower.indexOf(term);
    return found >= 0 && (best < 0 || found < best) ? found : best;
  }, -1);
  if (index < 0) index = 0;
  const start = Math.max(0, index - Math.floor(maxLength / 3));
  const end = Math.min(normalized.length, start + maxLength);
  return `${start > 0 ? "…" : ""}${normalized.slice(start, end)}${
    end < normalized.length ? "…" : ""
  }`;
}

function safeRelativePath(value) {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  const parts = normalized.split("/");
  if (
    normalized.startsWith("/") ||
    normalized.includes("\0") ||
    parts.some((part) => part === "." || part === "..")
  ) {
    return null;
  }
  return parts.filter(Boolean).join("/");
}

export class MemoryCanonIndex {
  constructor(documents) {
    this.documents = [...documents];
    this.byPath = new Map(this.documents.map((document) => [document.path, document]));
    this.byDocumentId = new Map(
      this.documents.map((document) => [document.id, document]),
    );
  }

  search(query, { limit = 10 } = {}) {
    const terms = tokenize(query);
    if (terms.length === 0) return [];
    const phrase = String(query).trim().toLowerCase();
    return this.documents
      .map((document) => {
        const title = document.title.toLowerCase();
        const relativePath = document.path.toLowerCase();
        const metadata = JSON.stringify(document.metadata).toLowerCase();
        const text = document.text.toLowerCase();
        let score = 0;
        for (const term of terms) {
          if (title.includes(term)) score += 12;
          if (relativePath.includes(term)) score += 8;
          if (metadata.includes(term)) score += 5;
          score += Math.min(text.split(term).length - 1, 8);
        }
        if (phrase && title.includes(phrase)) score += 20;
        if (phrase && text.includes(phrase)) score += 6;
        return { document, score };
      })
      .filter(({ score }) => score > 0)
      .sort(
        (a, b) =>
          b.score - a.score || a.document.path.localeCompare(b.document.path),
      )
      .slice(0, Math.max(1, Math.min(Number(limit) || 10, 20)))
      .map(({ document, score }) => ({
        id: document.id,
        title: document.title,
        url: document.url,
        kind: document.kind,
        score,
        snippet: makeExcerpt(document.text, terms),
      }));
  }

  resolve(identifier) {
    const value = String(identifier ?? "").trim();
    if (!value) return null;
    if (this.byDocumentId.has(value)) return this.byDocumentId.get(value);

    let relativePath = value;
    if (value.startsWith("canon://document/")) {
      relativePath = value.slice("canon://document/".length);
    } else {
      const byUrl = this.documents.find((document) => document.url === value);
      if (byUrl) return byUrl;
    }

    try {
      relativePath = relativePath
        .split("/")
        .map((part) => decodeURIComponent(part))
        .join("/");
    } catch {
      return null;
    }
    const safePath = safeRelativePath(relativePath);
    return safePath ? this.byPath.get(safePath) ?? null : null;
  }

  fetch(identifier) {
    const document = this.resolve(identifier);
    if (!document) return null;
    return {
      id: document.id,
      title: document.title,
      text: document.text,
      url: document.url,
      metadata: {
        ...document.metadata,
        record_id: document.recordId,
        record_kind: document.kind,
        canon_path: document.path,
      },
    };
  }

  getEntity(kind, identifier) {
    const normalizedKind = normalizeKind(kind);
    const normalizedIdentifier = String(identifier ?? "").trim().toLowerCase();
    if (!normalizedIdentifier) return null;
    const exact = this.documents.find(
      (document) =>
        document.kind === normalizedKind &&
        [document.recordId, document.title, document.path]
          .map((value) => String(value).toLowerCase())
          .includes(normalizedIdentifier),
    );
    if (exact) return { status: "found", record: this.fetch(exact.id) };
    return {
      status: "not_found",
      requested_kind: normalizedKind,
      requested_id: String(identifier),
      message: `No canonical ${normalizedKind} record matched the supplied identifier.`,
      candidates: this.search(identifier, { limit: 5 }),
    };
  }
}
