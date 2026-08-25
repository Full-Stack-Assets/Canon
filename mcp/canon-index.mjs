import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const DEFAULT_PUBLIC_BASE_URL =
  "https://github.com/Full-Stack-Assets/Canon/blob/main/";
const ROOT_FILES = new Set(["README.md", "PHASES.md"]);
const ROOT_DIRECTORIES = new Set([
  "aoc",
  "enforcement",
  "evidence",
  "mcp",
  "platforms",
  "preflight",
  "skills",
]);
const TEXT_EXTENSIONS = new Set([
  ".json",
  ".md",
  ".mdc",
  ".mjs",
  ".sh",
  ".txt",
  ".yaml",
  ".yml",
]);

function normalizeSlashes(value) {
  return value.split(path.sep).join("/");
}

function normalizeKind(value) {
  return String(value ?? "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function stripQuotes(value) {
  const trimmed = String(value ?? "").trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFlatYamlMetadata(text) {
  const metadata = {};
  for (const line of text.split(/\r?\n/)) {
    if (/^\s/.test(line) || /^\s*(?:#|---|$)/.test(line)) continue;
    const match = line.match(/^([A-Za-z_][\w-]*):\s*(.*?)\s*$/);
    if (!match || !match[2] || match[2] === ">" || match[2] === "|") continue;
    metadata[match[1]] = stripQuotes(match[2]);
  }
  return metadata;
}

function extractMetadata(relativePath, text) {
  const extension = path.extname(relativePath).toLowerCase();
  if (extension === ".json") {
    try {
      const value = JSON.parse(text);
      if (value && typeof value === "object" && !Array.isArray(value)) return value;
    } catch {
      return {};
    }
  }

  const frontmatter = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (frontmatter) return parseFlatYamlMetadata(frontmatter[1]);
  if (extension === ".yaml" || extension === ".yml") {
    return parseFlatYamlMetadata(text);
  }
  return {};
}

function inferKind(relativePath, metadata) {
  const declared = metadata.kind ?? metadata.record_type;
  if (declared) return normalizeKind(declared);
  if (relativePath.startsWith("aoc/roles/")) return "role";
  if (relativePath.startsWith("aoc/divisions/")) return "division";
  if (relativePath.startsWith("skills/") && relativePath.endsWith("/SKILL.md")) {
    return "skill";
  }
  if (relativePath.startsWith("evidence/receipts/")) return "receipt";
  if (relativePath.startsWith("evidence/")) return "evidence";
  if (relativePath.startsWith("enforcement/")) return "policy";
  if (relativePath.startsWith("platforms/")) return "platform_adapter";
  return "document";
}

function inferTitle(relativePath, text, metadata) {
  if (typeof metadata.title === "string" && metadata.title.trim()) {
    return metadata.title.trim();
  }
  if (typeof metadata.name === "string" && metadata.name.trim()) {
    return metadata.name.trim();
  }
  const heading = text.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].trim();
  return path.basename(relativePath, path.extname(relativePath));
}

function toDocumentId(relativePath) {
  return `canon://document/${relativePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function encodePublicPath(relativePath) {
  return relativePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
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

function tokenize(query) {
  return [...new Set(String(query).toLowerCase().match(/[a-z0-9][a-z0-9_-]*/g) ?? [])];
}

async function walkFiles(root, relativeDirectory = "") {
  const absoluteDirectory = path.join(root, relativeDirectory);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isSymbolicLink()) continue;
    const relativePath = normalizeSlashes(path.join(relativeDirectory, entry.name));
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(root, relativePath)));
    } else if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(relativePath);
    }
  }
  return files;
}

export class CanonIndex {
  constructor({
    root,
    publicBaseUrl = DEFAULT_PUBLIC_BASE_URL,
    maxFileBytes = 512 * 1024,
  }) {
    this.root = path.resolve(root);
    this.publicBaseUrl = publicBaseUrl.endsWith("/")
      ? publicBaseUrl
      : `${publicBaseUrl}/`;
    this.maxFileBytes = maxFileBytes;
    this.documents = [];
    this.byPath = new Map();
    this.byDocumentId = new Map();
  }

  async build() {
    const candidates = [];
    for (const file of ROOT_FILES) {
      try {
        const fileStat = await lstat(path.join(this.root, file));
        if (fileStat.isFile() && !fileStat.isSymbolicLink()) candidates.push(file);
      } catch {
        // Optional root document.
      }
    }
    for (const directory of ROOT_DIRECTORIES) {
      try {
        const directoryStat = await lstat(path.join(this.root, directory));
        if (directoryStat.isDirectory() && !directoryStat.isSymbolicLink()) {
          candidates.push(...(await walkFiles(this.root, directory)));
        }
      } catch {
        // Optional canonical area.
      }
    }

    const documents = [];
    for (const relativePath of [...new Set(candidates)].sort()) {
      if (relativePath.startsWith("mcp/generated/")) continue;
      const absolutePath = path.resolve(this.root, relativePath);
      if (!absolutePath.startsWith(`${this.root}${path.sep}`)) continue;
      const fileStat = await lstat(absolutePath);
      if (fileStat.size > this.maxFileBytes) continue;
      const text = await readFile(absolutePath, "utf8");
      const metadata = extractMetadata(relativePath, text);
      const document = {
        id: toDocumentId(relativePath),
        recordId:
          typeof metadata.id === "string" && metadata.id.trim()
            ? metadata.id.trim()
            : relativePath,
        path: relativePath,
        title: inferTitle(relativePath, text, metadata),
        kind: inferKind(relativePath, metadata),
        url: new URL(encodePublicPath(relativePath), this.publicBaseUrl).href,
        text,
        metadata,
      };
      documents.push(document);
    }

    this.documents = documents;
    this.byPath = new Map(documents.map((document) => [document.path, document]));
    this.byDocumentId = new Map(documents.map((document) => [document.id, document]));
    return this;
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
          const occurrences = text.split(term).length - 1;
          score += Math.min(occurrences, 8);
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
      try {
        relativePath = value
          .slice("canon://document/".length)
          .split("/")
          .map((part) => decodeURIComponent(part))
          .join("/");
      } catch {
        return null;
      }
    } else if (value.startsWith(this.publicBaseUrl)) {
      try {
        relativePath = decodeURIComponent(value.slice(this.publicBaseUrl.length));
      } catch {
        return null;
      }
    }

    relativePath = normalizeSlashes(path.normalize(relativePath)).replace(/^\.\//, "");
    if (
      relativePath.startsWith("../") ||
      path.isAbsolute(relativePath) ||
      relativePath.includes("\0")
    ) {
      return null;
    }
    return this.byPath.get(relativePath) ?? null;
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

    const candidates = this.search(identifier, { limit: 5 });
    return {
      status: "not_found",
      requested_kind: normalizedKind,
      requested_id: String(identifier),
      message: `No canonical ${normalizedKind} record matched the supplied identifier.`,
      candidates,
    };
  }
}

export async function createCanonIndex(options) {
  return new CanonIndex(options).build();
}

export const canonIndexInternals = {
  normalizeKind,
  toDocumentId,
};
