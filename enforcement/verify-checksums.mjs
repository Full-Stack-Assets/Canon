#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(root, "enforcement/checksums.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const failures = [];

for (const [path, expected] of Object.entries(manifest.sha256 ?? {})) {
  let content;
  try {
    content = readFileSync(resolve(root, path));
  } catch (error) {
    failures.push(`${path}: ${error.code ?? error.message}`);
    continue;
  }

  const actual = createHash("sha256").update(content).digest("hex");
  if (actual !== expected) failures.push(`${path}: expected ${expected}, got ${actual}`);
}

if (failures.length > 0) {
  process.stderr.write(`AOC/Canon checksum verification failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(`AOC/Canon checksums verified (${Object.keys(manifest.sha256).length} files, version ${manifest.version}).\n`);
