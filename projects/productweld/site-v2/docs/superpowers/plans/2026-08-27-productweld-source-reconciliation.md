# ProductWeld.tech Source-of-Truth Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the exact production source, Cloudflare delivery surface, and Git provenance for `productweld.tech`, leaving one authoritative Git repository and a verified no-production-change receipt before any v2 UI implementation begins.

**Architecture:** Perform read-only production fingerprinting first, then reconcile GitHub candidates against authenticated Cloudflare deployment metadata. If an existing Git source can be proven, adopt that lineage; otherwise initialize a new private `Full-Stack-Assets/ProductWeld` repository for v2 development without connecting it to production. Canon records the final decision and evidence. Production DNS, routes, deployments, billing, and public content remain unchanged throughout this plan.

**Tech Stack:** Git, GitHub CLI/API, Bash, `curl`, `dig`, OpenSSL, Cloudflare dashboard and/or Wrangler CLI, Python 3 standard library.

**Spec:** `projects/productweld/site-v2/docs/superpowers/specs/2026-08-27-productweld-tech-v2-design.md`

## Global Constraints

- `productweld.tech` is the canonical public domain under investigation.
- Do not change Cloudflare DNS, Pages routes, Worker routes, project bindings, custom domains, redirects, certificates, production environment variables, or production content.
- Do not deploy a new ProductWeld build in this plan.
- Do not merge application code or activate billing in this plan.
- GitHub must become the authoritative application source before v2 implementation proceeds.
- Cloudflare remains the delivery layer unless later evidence supports a separately approved migration.
- Any MFA, credential, Cloudflare-account, or authority ambiguity is a hard stop.
- Domain mentions alone do not prove source provenance.
- The gate clears only when one authoritative repository is recorded, the decision receipt validates, and the live HTML hash is unchanged from baseline.

---

## File Structure

### Canon

- Create: `tools/productweld/source-fingerprint.sh` — deterministic live-site evidence capture.
- Create: `tools/productweld/write_source_decision.py` — writes the final receipt only from explicit observed arguments.
- Create: `tools/productweld/validate_source_decision.py` — validates the receipt and no-production-change invariant.
- Create: `tests/productweld/test_source_reconciliation_tools.py` — standard-library unit tests.
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/README.md` — evidence index and gate definition.
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/*` — initial production fingerprint.
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/live-after/*` — final production fingerprint.
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/github-candidates.md` — Git candidate evidence and dispositions.
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/cloudflare-mapping.md` — authenticated delivery mapping.
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/source-decision.json` — machine-readable final decision.
- Create: `projects/productweld/site-v2/SOURCE-OF-TRUTH.md` — human-readable canonical relationship record.

### Resolved application repository

Exactly one path is allowed:

1. **Recovered source:** create non-production branch `chore/productweld-v2-provenance` in the proven repository and add `docs/productweld-source-provenance.md`.
2. **Unrecoverable source:** create private repository `Full-Stack-Assets/ProductWeld`, add `README.md` and `docs/productweld-source-provenance.md`, and leave it disconnected from Cloudflare production.

---

### Task 1: Add deterministic reconciliation tools

**Files:**
- Create: `tools/productweld/source-fingerprint.sh`
- Create: `tools/productweld/write_source_decision.py`
- Create: `tools/productweld/validate_source_decision.py`
- Create: `tests/productweld/test_source_reconciliation_tools.py`

**Interfaces:**
- `source-fingerprint.sh DOMAIN OUT_DIR` writes `headers.txt`, `index.html`, `index.sha256`, DNS files, TLS metadata, asset inventory, and `summary.txt`.
- `write_source_decision.py` consumes explicit CLI arguments and writes a JSON receipt.
- `validate_source_decision.py RECEIPT_PATH` exits 0 only for a complete, non-mutating, internally consistent receipt.

- [ ] **Step 1: Write failing standard-library tests**

Create `tests/productweld/test_source_reconciliation_tools.py`:

```python
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VALIDATOR = ROOT / "tools" / "productweld" / "validate_source_decision.py"
FINGERPRINT = ROOT / "tools" / "productweld" / "source-fingerprint.sh"


class SourceReconciliationToolsTest(unittest.TestCase):
    def valid_payload(self) -> dict:
        return {
            "domain": "productweld.tech",
            "decision": "RECOVER_EXISTING_SOURCE",
            "sourceRepository": "Full-Stack-Assets/example",
            "sourceRef": "main@0123456789abcdef0123456789abcdef01234567",
            "cloudflareSurface": "PAGES",
            "cloudflareProject": "productweld-production",
            "productionHtmlSha256Before": "a" * 64,
            "productionHtmlSha256After": "a" * 64,
            "productionMutated": False,
            "evidencePaths": [
                "projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/index.sha256"
            ],
            "verifiedAt": "2026-08-27T00:00:00Z",
        }

    def run_validator(self, payload: dict) -> subprocess.CompletedProcess[str]:
        with tempfile.TemporaryDirectory() as td:
            receipt = Path(td) / "source-decision.json"
            receipt.write_text(json.dumps(payload), encoding="utf-8")
            return subprocess.run(
                [sys.executable, str(VALIDATOR), str(receipt)],
                cwd=ROOT,
                text=True,
                capture_output=True,
            )

    def test_accepts_complete_non_mutating_receipt(self) -> None:
        result = self.run_validator(self.valid_payload())
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_rejects_mutated_production(self) -> None:
        payload = self.valid_payload()
        payload["productionMutated"] = True
        result = self.run_validator(payload)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("productionMutated", result.stderr)

    def test_rejects_hash_mismatch(self) -> None:
        payload = self.valid_payload()
        payload["productionHtmlSha256After"] = "b" * 64
        result = self.run_validator(payload)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("production hash changed", result.stderr)

    def test_rejects_unknown_decision(self) -> None:
        payload = self.valid_payload()
        payload["decision"] = "MAYBE"
        result = self.run_validator(payload)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("decision", result.stderr)

    def test_fingerprint_script_parses_as_bash(self) -> None:
        result = subprocess.run(
            ["bash", "-n", str(FINGERPRINT)],
            cwd=ROOT,
            text=True,
            capture_output=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests and confirm the expected failure**

```bash
python -m unittest tests.productweld.test_source_reconciliation_tools -v
```

Expected: FAIL because the three tool files do not exist.

- [ ] **Step 3: Implement the receipt validator**

Create `tools/productweld/validate_source_decision.py`:

```python
#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

REQUIRED = {
    "domain": str,
    "decision": str,
    "sourceRepository": str,
    "sourceRef": str,
    "cloudflareSurface": str,
    "cloudflareProject": str,
    "productionHtmlSha256Before": str,
    "productionHtmlSha256After": str,
    "productionMutated": bool,
    "evidencePaths": list,
    "verifiedAt": str,
}
DECISIONS = {"RECOVER_EXISTING_SOURCE", "CREATE_NEW_CANONICAL_SOURCE"}
SURFACES = {"PAGES", "WORKER", "OTHER"}
SHA256 = re.compile(r"^[0-9a-f]{64}$")
REPOSITORY = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: validate_source_decision.py <source-decision.json>")

    data = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    for key, expected_type in REQUIRED.items():
        if key not in data:
            fail(f"missing required field: {key}")
        if not isinstance(data[key], expected_type):
            fail(f"invalid type for {key}")
        if expected_type is str and not data[key].strip():
            fail(f"empty required field: {key}")

    if data["domain"] != "productweld.tech":
        fail("domain must be productweld.tech")
    if data["decision"] not in DECISIONS:
        fail("invalid decision")
    if data["cloudflareSurface"] not in SURFACES:
        fail("invalid cloudflareSurface")
    if not REPOSITORY.fullmatch(data["sourceRepository"]):
        fail("invalid sourceRepository")
    if not SHA256.fullmatch(data["productionHtmlSha256Before"]):
        fail("invalid productionHtmlSha256Before")
    if not SHA256.fullmatch(data["productionHtmlSha256After"]):
        fail("invalid productionHtmlSha256After")
    if data["productionMutated"] is not False:
        fail("productionMutated must be false")
    if data["productionHtmlSha256Before"] != data["productionHtmlSha256After"]:
        fail("production hash changed during reconciliation")
    if not data["evidencePaths"] or not all(
        isinstance(path, str) and path.strip() for path in data["evidencePaths"]
    ):
        fail("evidencePaths must contain non-empty paths")

    print("source decision receipt valid")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Implement the receipt writer**

Create `tools/productweld/write_source_decision.py`:

```python
#!/usr/bin/env python3
import argparse
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--decision", required=True)
    parser.add_argument("--source-repository", required=True)
    parser.add_argument("--source-ref", required=True)
    parser.add_argument("--cloudflare-surface", required=True)
    parser.add_argument("--cloudflare-project", required=True)
    parser.add_argument("--before-hash", required=True)
    parser.add_argument("--after-hash", required=True)
    parser.add_argument("--verified-at", required=True)
    args = parser.parse_args()

    payload = {
        "domain": "productweld.tech",
        "decision": args.decision,
        "sourceRepository": args.source_repository,
        "sourceRef": args.source_ref,
        "cloudflareSurface": args.cloudflare_surface,
        "cloudflareProject": args.cloudflare_project,
        "productionHtmlSha256Before": args.before_hash,
        "productionHtmlSha256After": args.after_hash,
        "productionMutated": False,
        "evidencePaths": [
            "projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/index.sha256",
            "projects/productweld/site-v2/evidence/source-reconciliation/live-after/index.sha256",
            "projects/productweld/site-v2/evidence/source-reconciliation/github-candidates.md",
            "projects/productweld/site-v2/evidence/source-reconciliation/cloudflare-mapping.md",
        ],
        "verifiedAt": args.verified_at,
    }
    Path(args.output).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Implement the production fingerprint collector**

Create `tools/productweld/source-fingerprint.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-productweld.tech}"
OUT="${2:-/tmp/productweld-source-fingerprint}"

if [[ "$DOMAIN" != "productweld.tech" ]]; then
  echo "refusing unexpected domain: $DOMAIN" >&2
  exit 2
fi

mkdir -p "$OUT"
curl --fail --silent --show-error --location --max-time 30 \
  --dump-header "$OUT/headers.txt" \
  "https://$DOMAIN/" \
  --output "$OUT/index.html"
openssl dgst -sha256 "$OUT/index.html" | awk '{print $2}' > "$OUT/index.sha256"
dig +short A "$DOMAIN" > "$OUT/dns-a.txt"
dig +short AAAA "$DOMAIN" > "$OUT/dns-aaaa.txt"
dig +short CNAME "$DOMAIN" > "$OUT/dns-cname.txt"
dig +short NS "$DOMAIN" > "$OUT/dns-ns.txt"
openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -serial -dates > "$OUT/tls-certificate.txt"
grep -Eoi '(src|href)=["'"'][^"'"']+["'"']' "$OUT/index.html" \
  | sed -E 's/^(src|href)=["'"']//; s/["'"']$//' \
  | sort -u > "$OUT/assets.txt" || true
{
  echo "domain=$DOMAIN"
  echo "captured_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "html_sha256=$(cat "$OUT/index.sha256")"
} > "$OUT/summary.txt"
printf 'fingerprint written to %s\n' "$OUT"
```

- [ ] **Step 6: Run tests and confirm success**

```bash
python -m unittest tests.productweld.test_source_reconciliation_tools -v
```

Expected: 5 tests PASS.

- [ ] **Step 7: Commit the tooling**

```bash
git add tools/productweld tests/productweld
git commit -m "test: add ProductWeld source reconciliation tooling"
```

---

### Task 2: Capture the immutable production baseline

**Files:**
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/README.md`
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/*`

**Interfaces:**
- Consumes: `source-fingerprint.sh`.
- Produces: the before-state HTML SHA-256 and network evidence used by the completion gate.

- [ ] **Step 1: Capture the baseline**

```bash
rm -rf /tmp/productweld-baseline
bash tools/productweld/source-fingerprint.sh productweld.tech /tmp/productweld-baseline
mkdir -p projects/productweld/site-v2/evidence/source-reconciliation/live-baseline
cp -R /tmp/productweld-baseline/. projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/
```

Expected: `live-baseline/index.sha256` contains one 64-character lowercase SHA-256.

- [ ] **Step 2: Verify the baseline contract**

```bash
test "$(wc -c < projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/index.sha256 | tr -d ' ')" -eq 65
grep -q '^domain=productweld.tech$' projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/summary.txt
```

Expected: both commands exit 0.

- [ ] **Step 3: Create the evidence index**

Create `projects/productweld/site-v2/evidence/source-reconciliation/README.md`:

```markdown
# ProductWeld.tech Source Reconciliation Evidence

## Scope
Evidence used to reconcile the production source for `productweld.tech` before v2 implementation.

## Production-change policy
This reconciliation is read-only against production. DNS, Cloudflare routes, custom domains, deployment configuration, and public content remain unchanged until a separately approved release step.

## Evidence sets
- `live-baseline/` — initial DNS, TLS, HTTP, HTML, assets, and HTML SHA-256.
- `live-after/` — final production fingerprint after repository reconciliation.
- `github-candidates.md` — candidate repositories and evidence dispositions.
- `cloudflare-mapping.md` — authenticated Cloudflare mapping.
- `source-decision.json` — final machine-readable source decision.

## Gate
The gate clears only when the receipt validator passes and the baseline/final HTML SHA-256 values are identical.
```

- [ ] **Step 4: Commit the baseline**

```bash
git add projects/productweld/site-v2/evidence/source-reconciliation
git commit -m "docs: capture ProductWeld production baseline"
```

---

### Task 3: Search GitHub and disposition every plausible source candidate

**Files:**
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/github-candidates.md`

**Interfaces:**
- Consumes: domain, baseline asset inventory, GitHub access.
- Produces: candidate sections with `PROVEN`, `POSSIBLE`, or `REJECTED` disposition.

- [ ] **Step 1: Search repository metadata and code**

```bash
gh search repos ProductWeld --owner Full-Stack-Assets --limit 1000 --json nameWithOwner,url,visibility,updatedAt > /tmp/productweld-repos.json
gh search code '"productweld.tech"' --owner Full-Stack-Assets --limit 1000 --json repository,path,url > /tmp/productweld-domain-hits.json
gh search code 'ProductWeld' --owner Full-Stack-Assets --limit 1000 --json repository,path,url > /tmp/productweld-brand-hits.json
gh search code 'filename:wrangler.toml' --owner Full-Stack-Assets --limit 1000 --json repository,path,url > /tmp/productweld-wrangler-hits.json || true
gh search code 'pages_build_output_dir' --owner Full-Stack-Assets --limit 1000 --json repository,path,url > /tmp/productweld-pages-hits.json || true
```

Expected: each output is valid JSON, including `[]` when there are no results.

- [ ] **Step 2: Search distinctive live asset basenames**

```bash
sed -n '1,60p' projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/assets.txt
```

For each JavaScript or CSS asset with a distinctive hashed basename, run an exact quoted `gh search code` for that basename. Do not use generic names such as `main.js`, `style.css`, or `index.css` as provenance evidence.

- [ ] **Step 3: Inspect each plausible repository**

For every candidate containing ProductWeld-specific source or Cloudflare configuration:

```bash
gh repo view OWNER/REPOSITORY --json nameWithOwner,defaultBranchRef,url,visibility,updatedAt
gh api repos/OWNER/REPOSITORY/contents --jq '.[] | [.type,.path,.sha] | @tsv'
```

Inspect existing `package.json`, lockfiles, `wrangler.*`, `_routes.json`, `CNAME`, deployment workflows, and homepage source. Do not infer files that are absent.

- [ ] **Step 4: Write the candidate report**

Create `github-candidates.md` with one section per candidate:

```markdown
## OWNER/REPOSITORY
- Disposition: PROVEN | POSSIBLE | REJECTED
- Default branch: recorded from GitHub
- Relevant paths: recorded from GitHub
- Domain evidence: observed evidence
- Cloudflare/deployment evidence: observed evidence
- Live-asset evidence: observed evidence
- Reason for disposition: evidence-based conclusion
```

Use `PROVEN` only when authenticated Cloudflare metadata, exact deployment commit metadata, or a reproducible production build match ties that repository to production.

- [ ] **Step 5: Commit GitHub evidence**

```bash
git add projects/productweld/site-v2/evidence/source-reconciliation/github-candidates.md
git commit -m "docs: record ProductWeld GitHub source candidates"
```

---

### Task 4: Map the authenticated Cloudflare production surface

**Files:**
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/cloudflare-mapping.md`

**Interfaces:**
- Consumes: authenticated Cloudflare account, `productweld.tech`, GitHub candidate report.
- Produces: exact delivery surface, project/worker identity, domain binding, deployment timestamp, and source metadata if exposed.

- [ ] **Step 1: Verify authenticated access**

```bash
npx --yes wrangler@latest whoami
```

Expected: authenticated account identity and account ID. If login, MFA, or credentials are required, stop and report that blocker.

- [ ] **Step 2: Enumerate Pages projects**

```bash
npx --yes wrangler@latest pages project list
```

Expected: authenticated Pages project list or an authenticated response showing none.

- [ ] **Step 3: Inspect the Cloudflare dashboard without editing**

Record from the authenticated `productweld.tech` zone:

1. apex and `www` DNS records, if present;
2. whether production is Pages, Workers, proxied external origin, or another Cloudflare surface;
3. exact Pages project or Worker/service name;
4. current custom-domain or route binding;
5. latest production deployment timestamp;
6. Git repository and commit metadata if Cloudflare exposes them.

Do not save any dashboard setting.

- [ ] **Step 4: Cross-check any Cloudflare commit against GitHub**

When Cloudflare exposes an exact repository and commit:

```bash
gh api repos/OWNER/REPOSITORY/commits/COMMIT_SHA --jq '{sha: .sha, url: .html_url, committed: .commit.committer.date, message: .commit.message}'
```

Expected: the exact commit resolves. Otherwise the candidate remains unproven.

- [ ] **Step 5: Write the mapping report**

Create `cloudflare-mapping.md` with:

```markdown
# Cloudflare Production Mapping

## Authentication evidence
## Zone and DNS mapping
## Delivery surface
## Project or Worker identity
## Production custom-domain or route binding
## Most recent production deployment
## Git repository / commit metadata
## Cross-check against GitHub candidates
## Unresolved blockers
## Production changes made
```

`## Production changes made` must state `None`.

- [ ] **Step 6: Commit Cloudflare evidence**

```bash
git add projects/productweld/site-v2/evidence/source-reconciliation/cloudflare-mapping.md
git commit -m "docs: map ProductWeld Cloudflare production source"
```

---

### Task 5: Prove one existing source or prove that recovery failed

**Files:**
- Modify: `projects/productweld/site-v2/evidence/source-reconciliation/github-candidates.md`

**Interfaces:**
- Consumes: Cloudflare mapping and GitHub candidates.
- Produces: exactly one `PROVEN` repository or zero `PROVEN` repositories with evidence-backed rejection reasons.

- [ ] **Step 1: Apply the proof rule**

An existing repository is `PROVEN` only when one of these is true:

1. Cloudflare production metadata names the exact repository and deployment commit;
2. a Cloudflare deployment artifact is tied to a commit in that repository; or
3. a clean checkout of a specific repository commit reproduces distinctive production assets and HTML structure without contradictory Cloudflare metadata.

- [ ] **Step 2: Verify exposed deployment commits**

When a commit is available:

```bash
gh api repos/OWNER/REPOSITORY/commits/COMMIT_SHA --jq '.sha'
gh api repos/OWNER/REPOSITORY/branches --paginate --jq '.[].name'
```

Expected: exact commit resolves; record whether it is reachable from the default branch.

- [ ] **Step 3: Build only when needed and only from documented repository instructions**

If Cloudflare does not expose a commit, inspect the repository's own manifest, lockfile, README, and deployment workflow. Use its documented package manager and build command. Compare distinctive built asset basenames and HTML structure against `live-baseline/`. Record every command and result in `github-candidates.md`.

- [ ] **Step 4: Enforce the single-source result**

```bash
PROVEN_COUNT=$(grep -c 'Disposition: PROVEN' projects/productweld/site-v2/evidence/source-reconciliation/github-candidates.md || true)
test "$PROVEN_COUNT" -le 1
printf 'proven candidates: %s\n' "$PROVEN_COUNT"
```

Expected: `0` or `1`; values above `1` block continuation.

- [ ] **Step 5: Commit final dispositions**

```bash
git add projects/productweld/site-v2/evidence/source-reconciliation/github-candidates.md
git commit -m "docs: finalize ProductWeld source provenance disposition"
```

---

### Task 6: Establish one authoritative application repository without production cutover

**Files:**
- Recovered path: create `docs/productweld-source-provenance.md` in the proven repository on branch `chore/productweld-v2-provenance`.
- New-source path: create private repository `Full-Stack-Assets/ProductWeld` with `README.md` and `docs/productweld-source-provenance.md`.

**Interfaces:**
- Consumes: proven-candidate count and Cloudflare mapping.
- Produces: one authoritative application repository and one exact source ref.

- [ ] **Step 1: Determine the evidence-selected path**

```bash
PROVEN_COUNT=$(grep -c 'Disposition: PROVEN' projects/productweld/site-v2/evidence/source-reconciliation/github-candidates.md || true)
printf '%s\n' "$PROVEN_COUNT"
```

Expected: `1` selects recovery; `0` selects new canonical source.

- [ ] **Step 2A: Recovery path**

Clone the proven repository and branch from the verified deployment commit:

```bash
gh repo clone OWNER/REPOSITORY /tmp/productweld-recovered
cd /tmp/productweld-recovered
git fetch --all --tags
git switch --create chore/productweld-v2-provenance COMMIT_SHA
mkdir -p docs
```

Create `docs/productweld-source-provenance.md` recording the canonical domain, exact Cloudflare delivery surface/project, verified production deployment commit, Canon evidence path, no-production-change statement, and requirement that v2 work derive from this lineage or a separately approved migration.

```bash
git add docs/productweld-source-provenance.md
git commit -m "docs: record ProductWeld production provenance"
git push -u origin chore/productweld-v2-provenance
```

Do not merge or deploy the branch.

- [ ] **Step 2B: New canonical source path**

Reconfirm that the repository name is unused:

```bash
if gh repo view Full-Stack-Assets/ProductWeld >/dev/null 2>&1; then
  echo "Full-Stack-Assets/ProductWeld already exists; stop and inspect before proceeding" >&2
  exit 1
fi
```

Create a private repository disconnected from production:

```bash
cd /tmp
gh repo create Full-Stack-Assets/ProductWeld --private --description "Canonical source for ProductWeld.tech" --clone
cd ProductWeld
mkdir -p docs
printf '# ProductWeld\n\nCanonical source repository for ProductWeld.tech v2. Production traffic is not connected to this repository until a separately approved Cloudflare cutover.\n' > README.md
```

Create `docs/productweld-source-provenance.md` recording the failed recovery conclusion, Canon evidence path, existing Cloudflare production identity, this repository's new source-of-truth role, and the no-cutover boundary.

```bash
git add README.md docs/productweld-source-provenance.md
git commit -m "chore: initialize canonical ProductWeld source"
git push -u origin main
```

Do not create a Pages project, Worker route, DNS record, custom-domain binding, production secret, or deployment in this plan.

- [ ] **Step 3: Capture the authoritative repository and ref**

Run inside the authoritative application repository:

```bash
SOURCE_REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
SOURCE_BRANCH=$(git branch --show-current)
SOURCE_SHA=$(git rev-parse HEAD)
printf 'source_repository=%s\nsource_ref=%s@%s\n' "$SOURCE_REPO" "$SOURCE_BRANCH" "$SOURCE_SHA"
```

Expected: one `Full-Stack-Assets/...` repository and one 40-character commit SHA.

---

### Task 7: Write and validate the Canon source decision

**Files:**
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/live-after/*`
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/source-decision.json`
- Create: `projects/productweld/site-v2/SOURCE-OF-TRUTH.md`

**Interfaces:**
- Consumes: authoritative repository/ref, observed Cloudflare surface/project, baseline hash.
- Produces: machine-validated source decision and canonical relationship record.

- [ ] **Step 1: Recapture production after repository reconciliation**

```bash
cd /path/to/Canon
rm -rf /tmp/productweld-after
bash tools/productweld/source-fingerprint.sh productweld.tech /tmp/productweld-after
mkdir -p projects/productweld/site-v2/evidence/source-reconciliation/live-after
cp -R /tmp/productweld-after/. projects/productweld/site-v2/evidence/source-reconciliation/live-after/
BEFORE_HASH=$(cat projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/index.sha256)
AFTER_HASH=$(cat projects/productweld/site-v2/evidence/source-reconciliation/live-after/index.sha256)
test "$BEFORE_HASH" = "$AFTER_HASH"
```

Expected: exit 0. If the hash differs, stop and investigate before asserting no production mutation.

- [ ] **Step 2: Set the observed reconciliation values**

Set these shell variables from Tasks 4–6, using the exact observed values:

```bash
DECISION=RECOVER_EXISTING_SOURCE
SOURCE_REPO=Full-Stack-Assets/verified-repository
SOURCE_REF=chore/productweld-v2-provenance@0123456789abcdef0123456789abcdef01234567
CF_SURFACE=PAGES
CF_PROJECT=verified-cloudflare-project
```

Use `CREATE_NEW_CANONICAL_SOURCE` for `DECISION` when Task 6 used the new-source path. `CF_SURFACE` must be exactly `PAGES`, `WORKER`, or `OTHER`. The strings above demonstrate the required shell-variable shape; execution must use the values actually observed and recorded in the evidence files.

- [ ] **Step 3: Generate the receipt from the observed variables**

```bash
python tools/productweld/write_source_decision.py \
  --output projects/productweld/site-v2/evidence/source-reconciliation/source-decision.json \
  --decision "$DECISION" \
  --source-repository "$SOURCE_REPO" \
  --source-ref "$SOURCE_REF" \
  --cloudflare-surface "$CF_SURFACE" \
  --cloudflare-project "$CF_PROJECT" \
  --before-hash "$BEFORE_HASH" \
  --after-hash "$AFTER_HASH" \
  --verified-at "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

- [ ] **Step 4: Validate the receipt**

```bash
python tools/productweld/validate_source_decision.py projects/productweld/site-v2/evidence/source-reconciliation/source-decision.json
```

Expected: `source decision receipt valid`.

- [ ] **Step 5: Create the human-readable source-of-truth record**

Create `projects/productweld/site-v2/SOURCE-OF-TRUTH.md` with:

```markdown
# ProductWeld.tech Source of Truth

## Canonical public domain
## Authoritative application repository
## Authoritative source ref
## Cloudflare delivery surface
## Production project / Worker
## Source decision
## Evidence
## Production-change status
## Authority boundary
## Next implementation plans
```

Populate every section from the validated receipt and evidence. The authority boundary must state that Canon is authoritative for policy/evidence/receipts, the application repository is authoritative for site source, Cloudflare is the delivery layer, and production deployment/DNS changes remain Human Authority-gated.

Under `## Next implementation plans`, record these five plan boundaries in order:

1. Public shell, design system, navigation, and core routes.
2. Venture evidence registry and evidence-backed content.
3. Acquire route and public Acquisition Financeability sample report.
4. Intake forms, analytics, SEO, accessibility, performance, and security hardening.
5. Cloudflare deployment, domain cutover, release verification, and rollback.

- [ ] **Step 6: Commit the final reconciliation records**

```bash
git add projects/productweld/site-v2/evidence/source-reconciliation projects/productweld/site-v2/SOURCE-OF-TRUTH.md
git commit -m "docs: establish ProductWeld source of truth"
```

---

### Task 8: Run the reconciliation acceptance gate

**Files:**
- Modify only if required to fix a failed validation from Tasks 1–7.

**Interfaces:**
- Consumes: all reconciliation evidence and the decision receipt.
- Produces: PASS/FAIL gate for downstream v2 implementation planning.

- [ ] **Step 1: Run all reconciliation tests**

```bash
python -m unittest tests.productweld.test_source_reconciliation_tools -v
```

Expected: all 5 tests PASS.

- [ ] **Step 2: Validate the final receipt again**

```bash
python tools/productweld/validate_source_decision.py projects/productweld/site-v2/evidence/source-reconciliation/source-decision.json
```

Expected: `source decision receipt valid`.

- [ ] **Step 3: Verify production HTML is unchanged**

```bash
cmp \
  projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/index.sha256 \
  projects/productweld/site-v2/evidence/source-reconciliation/live-after/index.sha256
```

Expected: exit 0.

- [ ] **Step 4: Verify exactly one authoritative repository is recorded**

```bash
python - <<'PY'
import json
from pathlib import Path
p = Path("projects/productweld/site-v2/evidence/source-reconciliation/source-decision.json")
d = json.loads(p.read_text(encoding="utf-8"))
assert d["sourceRepository"].startswith("Full-Stack-Assets/")
assert d["sourceRepository"].count("/") == 1
print(d["sourceRepository"], d["sourceRef"])
PY
```

Expected: one repository/ref pair prints successfully.

- [ ] **Step 5: Verify the Canon worktree is clean**

```bash
git status --short
```

Expected: no output.

- [ ] **Step 6: Open a draft reconciliation PR**

```bash
gh pr create \
  --repo Full-Stack-Assets/Canon \
  --base design/productweld-tech-v2-spec \
  --head plan/productweld-tech-v2-source-reconciliation \
  --draft \
  --title "docs: reconcile ProductWeld.tech production source" \
  --body "Establishes the evidence-backed ProductWeld.tech source-of-truth decision without changing production. Downstream v2 implementation planning remains blocked until this reconciliation gate passes."
```

Expected: draft PR URL.

---

## Plan Self-Review

### Spec coverage

This plan covers the design spec's first hard dependency: identify the actual Cloudflare production source, determine whether Git provenance is recoverable, establish one authoritative application repository, keep Cloudflare as delivery by default, and make no production cutover during reconciliation.

The remaining v2 scope is intentionally split into five downstream plans because exact application files, build commands, and tests cannot be named honestly until this gate resolves the source repository and source ref.

### Placeholder scan

The plan contains no `TBD`, `TODO`, "implement later", "similar to Task N", or unspecified error-handling steps. Test fixtures and shell-shape examples are explicitly non-production examples; the executable receipt is generated only from observed reconciliation values and must pass machine validation.

### Type and interface consistency

The writer and validator use the same receipt fields: `domain`, `decision`, `sourceRepository`, `sourceRef`, `cloudflareSurface`, `cloudflareProject`, `productionHtmlSha256Before`, `productionHtmlSha256After`, `productionMutated`, `evidencePaths`, and `verifiedAt`.

Both before/after production checks use the same `source-fingerprint.sh` SHA-256 calculation, preventing mixed-fingerprint comparisons.

## Completion Gate

This plan clears only when:

1. the live `productweld.tech` baseline and final fingerprints are captured;
2. all plausible GitHub candidates are dispositioned;
3. authenticated Cloudflare delivery is mapped;
4. exactly one authoritative application repository exists;
5. `source-decision.json` passes machine validation;
6. baseline and final HTML SHA-256 values are identical;
7. no DNS, Cloudflare route, deployment, billing, or public-content mutation occurred;
8. Canon records the application repository, source ref, Cloudflare surface/project, and authority boundary.

Only after this gate clears should the next ProductWeld.tech v2 implementation plan be written against the resolved application repository.