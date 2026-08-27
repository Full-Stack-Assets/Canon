# ProductWeld.tech Source-of-Truth Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the exact production source, Cloudflare delivery surface, and Git provenance for `productweld.tech`, leaving one authoritative Git repository and a verified no-production-change receipt before any v2 UI implementation begins.

**Architecture:** This plan is an evidence-first reconciliation pass. It starts with a read-only production fingerprint, searches GitHub for candidate source, maps the authenticated Cloudflare project/worker and deployment metadata, then either recovers an existing production-backed repository or creates a new canonical `Full-Stack-Assets/ProductWeld` repository without cutting traffic over. Canon records the final source-of-truth decision; production DNS, routes, deployment, billing, and public content remain unchanged.

**Tech Stack:** Git, GitHub CLI/API, Bash, `curl`, `dig`, OpenSSL, Cloudflare dashboard and/or Wrangler CLI, Python 3 standard library for receipt validation.

**Spec:** `projects/productweld/site-v2/docs/superpowers/specs/2026-08-27-productweld-tech-v2-design.md`

## Global Constraints

- `productweld.tech` is the canonical public domain under investigation.
- Do not change Cloudflare DNS, Pages routes, Worker routes, project bindings, custom domains, redirects, certificates, or production environment variables in this plan.
- Do not deploy a new ProductWeld build in this plan.
- Do not merge application code, activate billing, publish confidential acquisition data, or alter the public site's content.
- GitHub must become the authoritative source for the v2 application before implementation proceeds.
- Cloudflare remains the delivery layer unless later implementation evidence justifies a separately approved change.
- The public site is a presentation and intake surface; it is not Canon and must not gain authority over acquisition truth or Human Authority.
- Any authentication, MFA, credential, or Cloudflare-account ambiguity is a hard stop and must be reported rather than bypassed.
- Capture evidence before conclusions. A candidate repository is not authoritative merely because it mentions ProductWeld or the domain.
- The reconciliation gate clears only when the production source decision is explicit, evidence-backed, machine-validated, and production is verified unchanged.

---

## File Structure

This plan creates reconciliation evidence only in Canon and, conditionally, a provenance document in the resolved application repository.

### Canon files

- Create: `projects/productweld/site-v2/evidence/source-reconciliation/README.md` — scope, evidence index, and no-production-change declaration.
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/` — captured DNS, headers, HTML hash, TLS, and asset inventory.
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/github-candidates.md` — GitHub search results and candidate disposition.
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/cloudflare-mapping.md` — authenticated Cloudflare mapping and deployment metadata.
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/source-decision.json` — final machine-readable source decision.
- Create: `projects/productweld/site-v2/SOURCE-OF-TRUTH.md` — canonical human-readable relationship record.
- Create: `tools/productweld/source-fingerprint.sh` — deterministic live-site fingerprint collector.
- Create: `tools/productweld/validate_source_decision.py` — machine validation for the final receipt.
- Test: `tests/productweld/test_source_reconciliation_tools.py` — unit tests for the validator and shell script syntax/contract.

### Resolved application repository

Exactly one of these outcomes is allowed:

1. **Recovered source:** add `docs/productweld-source-provenance.md` to the verified existing repository on a non-production branch.
2. **Unrecoverable source:** create private repository `Full-Stack-Assets/ProductWeld`, initialize it with `README.md` and `docs/productweld-source-provenance.md`, and do not connect it to Cloudflare in this plan.

---

### Task 1: Add deterministic reconciliation tooling

**Files:**
- Create: `tools/productweld/source-fingerprint.sh`
- Create: `tools/productweld/validate_source_decision.py`
- Create: `tests/productweld/test_source_reconciliation_tools.py`

**Interfaces:**
- Consumes: domain string, output directory, final source decision JSON.
- Produces: stable live-site evidence files and exit-code validation for the source decision receipt.

- [ ] **Step 1: Write the failing validator tests**

Create `tests/productweld/test_source_reconciliation_tools.py` with:

```python
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VALIDATOR = ROOT / "tools" / "productweld" / "validate_source_decision.py"
FINGERPRINT = ROOT / "tools" / "productweld" / "source-fingerprint.sh"


def run_validator(tmp_path: Path, payload: dict) -> subprocess.CompletedProcess[str]:
    receipt = tmp_path / "source-decision.json"
    receipt.write_text(json.dumps(payload), encoding="utf-8")
    return subprocess.run(
        [sys.executable, str(VALIDATOR), str(receipt)],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )


def valid_payload() -> dict:
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


def test_accepts_complete_non_mutating_receipt(tmp_path: Path) -> None:
    result = run_validator(tmp_path, valid_payload())
    assert result.returncode == 0, result.stderr


def test_rejects_mutated_production(tmp_path: Path) -> None:
    payload = valid_payload()
    payload["productionMutated"] = True
    result = run_validator(tmp_path, payload)
    assert result.returncode != 0
    assert "productionMutated" in result.stderr


def test_rejects_hash_mismatch(tmp_path: Path) -> None:
    payload = valid_payload()
    payload["productionHtmlSha256After"] = "b" * 64
    result = run_validator(tmp_path, payload)
    assert result.returncode != 0
    assert "production hash changed" in result.stderr


def test_rejects_unknown_decision(tmp_path: Path) -> None:
    payload = valid_payload()
    payload["decision"] = "MAYBE"
    result = run_validator(tmp_path, payload)
    assert result.returncode != 0
    assert "decision" in result.stderr


def test_fingerprint_script_parses_as_bash() -> None:
    result = subprocess.run(
        ["bash", "-n", str(FINGERPRINT)],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )
    assert result.returncode == 0, result.stderr
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
python -m pytest tests/productweld/test_source_reconciliation_tools.py -v
```

Expected: FAIL because the validator and fingerprint script do not exist yet.

- [ ] **Step 3: Implement the receipt validator**

Create `tools/productweld/validate_source_decision.py` with:

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
REPO = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: validate_source_decision.py <source-decision.json>")

    path = Path(sys.argv[1])
    data = json.loads(path.read_text(encoding="utf-8"))

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
    if not REPO.fullmatch(data["sourceRepository"]):
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
        isinstance(item, str) and item.strip() for item in data["evidencePaths"]
    ):
        fail("evidencePaths must contain at least one non-empty path")

    print("source decision receipt valid")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Implement the live fingerprint collector**

Create `tools/productweld/source-fingerprint.sh` with:

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
  | openssl x509 -noout -subject -issuer -serial -dates \
  > "$OUT/tls-certificate.txt"

grep -Eoi '(src|href)=["'"'][^"'"']+["'"']' "$OUT/index.html" \
  | sed -E 's/^(src|href)=["'"']//; s/["'"']$//' \
  | sort -u \
  > "$OUT/assets.txt" || true

{
  echo "domain=$DOMAIN"
  echo "captured_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "html_sha256=$(cat "$OUT/index.sha256")"
} > "$OUT/summary.txt"

printf 'fingerprint written to %s\n' "$OUT"
```

- [ ] **Step 5: Run the tests to verify they pass**

Run:

```bash
python -m pytest tests/productweld/test_source_reconciliation_tools.py -v
```

Expected: 5 tests PASS.

- [ ] **Step 6: Commit the tooling**

```bash
git add tools/productweld/source-fingerprint.sh \
  tools/productweld/validate_source_decision.py \
  tests/productweld/test_source_reconciliation_tools.py
git commit -m "test: add ProductWeld source reconciliation tooling"
```

---

### Task 2: Capture the immutable production baseline

**Files:**
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/README.md`
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/headers.txt`
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/index.html`
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/index.sha256`
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/dns-a.txt`
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/dns-aaaa.txt`
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/dns-cname.txt`
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/dns-ns.txt`
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/tls-certificate.txt`
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/assets.txt`
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/summary.txt`

**Interfaces:**
- Consumes: `tools/productweld/source-fingerprint.sh`.
- Produces: the before-state hash and network evidence later tasks must preserve.

- [ ] **Step 1: Capture the baseline into the canonical evidence path**

Run from the Canon repository root:

```bash
rm -rf /tmp/productweld-baseline
bash tools/productweld/source-fingerprint.sh productweld.tech /tmp/productweld-baseline
mkdir -p projects/productweld/site-v2/evidence/source-reconciliation/live-baseline
cp -R /tmp/productweld-baseline/. \
  projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/
```

Expected: `summary.txt` contains `domain=productweld.tech` and a 64-character SHA-256 value.

- [ ] **Step 2: Verify Cloudflare-facing evidence is captured without inferring the deployment product**

Run:

```bash
grep -Ei '^(server:|cf-ray:|cf-cache-status:|location:)' \
  projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/headers.txt || true
cat projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/dns-ns.txt
```

Expected: evidence is printed. Do not label the site as Pages versus Workers from headers alone.

- [ ] **Step 3: Create the reconciliation evidence index**

Create `projects/productweld/site-v2/evidence/source-reconciliation/README.md` with these exact sections:

```markdown
# ProductWeld.tech Source Reconciliation Evidence

## Scope
This directory records the evidence used to reconcile the production source for `productweld.tech` before ProductWeld.tech v2 implementation.

## Production-change policy
This reconciliation is read-only against production. DNS, Cloudflare routes, custom domains, deployment configuration, and public content must remain unchanged until a separately authorized release step.

## Evidence sets
- `live-baseline/` — DNS, TLS, HTTP headers, HTML, asset inventory, and baseline HTML SHA-256.
- `github-candidates.md` — candidate repositories and evidence disposition.
- `cloudflare-mapping.md` — authenticated Cloudflare project/worker mapping.
- `source-decision.json` — machine-readable final source-of-truth receipt.

## Gate
The gate clears only when `tools/productweld/validate_source_decision.py` accepts `source-decision.json` and a final live fingerprint proves that the production HTML hash did not change during reconciliation.
```

- [ ] **Step 4: Commit the production baseline**

```bash
git add projects/productweld/site-v2/evidence/source-reconciliation
git commit -m "docs: capture ProductWeld production baseline"
```

---

### Task 3: Exhaustively search GitHub for candidate production source

**Files:**
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/github-candidates.md`

**Interfaces:**
- Consumes: production domain, baseline asset inventory, GitHub account access.
- Produces: explicit candidate list with `PROVEN`, `POSSIBLE`, or `REJECTED` disposition and supporting evidence.

- [ ] **Step 1: Search repository metadata for ProductWeld**

Run:

```bash
gh search repos ProductWeld --owner Full-Stack-Assets --limit 100 \
  --json nameWithOwner,url,visibility,updatedAt > /tmp/productweld-repos.json
cat /tmp/productweld-repos.json
```

Expected: record every returned repository. An empty result is valid evidence.

- [ ] **Step 2: Search code for domain and brand markers**

Run:

```bash
gh search code '"productweld.tech"' --owner Full-Stack-Assets --limit 100 \
  --json repository,path,url > /tmp/productweld-domain-hits.json

gh search code 'ProductWeld' --owner Full-Stack-Assets --limit 100 \
  --json repository,path,url > /tmp/productweld-brand-hits.json

gh search code 'filename:wrangler.toml' --owner Full-Stack-Assets --limit 100 \
  --json repository,path,url > /tmp/productweld-wrangler-hits.json || true

gh search code 'pages_build_output_dir' --owner Full-Stack-Assets --limit 100 \
  --json repository,path,url > /tmp/productweld-pages-hits.json || true
```

Expected: JSON files contain the complete first 100 code-search results for each query or `[]`.

- [ ] **Step 3: Search for live asset names in GitHub when the baseline exposes fingerprintable assets**

Run:

```bash
sed -n '1,40p' \
  projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/assets.txt
```

For each JavaScript or CSS asset containing a non-generic hashed basename, run an exact quoted GitHub code search for that basename. Record the command and result in the candidate report. Do not treat a generic name such as `main.js`, `style.css`, or `index.css` as provenance evidence.

- [ ] **Step 4: Inspect every plausible candidate at its current default branch**

For each repository that contains ProductWeld-specific source or Cloudflare configuration, run:

```bash
gh repo view OWNER/REPO --json nameWithOwner,defaultBranchRef,url,visibility,updatedAt

gh api repos/OWNER/REPO/contents --jq '.[] | [.type,.path,.sha] | @tsv'
```

Then inspect any `package.json`, `wrangler.toml`, `wrangler.json`, `wrangler.jsonc`, `_routes.json`, `CNAME`, deployment workflow, or homepage source that exists. Do not fabricate missing files.

- [ ] **Step 5: Write the candidate disposition report**

Create `projects/productweld/site-v2/evidence/source-reconciliation/github-candidates.md` with one section per candidate and these fields:

```markdown
## OWNER/REPOSITORY
- Disposition: PROVEN | POSSIBLE | REJECTED
- Default branch:
- Relevant paths:
- Domain evidence:
- Cloudflare/deployment evidence:
- Live-asset match evidence:
- Reason for disposition:
```

Use `PROVEN` only if the repository can be tied to the live deployment by authenticated Cloudflare metadata, exact deployment commit metadata, or a reproducible production build match. Domain text alone is insufficient.

- [ ] **Step 6: Commit the GitHub evidence**

```bash
git add projects/productweld/site-v2/evidence/source-reconciliation/github-candidates.md
git commit -m "docs: record ProductWeld GitHub source candidates"
```

---

### Task 4: Map the authenticated Cloudflare production surface

**Files:**
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/cloudflare-mapping.md`

**Interfaces:**
- Consumes: authenticated Cloudflare account access, domain `productweld.tech`, GitHub candidate report.
- Produces: exact Cloudflare surface, project/worker name, production custom-domain mapping, deployment timestamp, and source metadata if Cloudflare exposes it.

- [ ] **Step 1: Verify authenticated Cloudflare access before reading project metadata**

Run:

```bash
npx --yes wrangler@latest whoami
```

Expected: an authenticated Cloudflare account identity and account ID are displayed.

If Wrangler requires login, MFA, or credentials not already authenticated, stop this task and report the exact blocker. Do not create a token, bypass MFA, or change account settings as part of this plan.

- [ ] **Step 2: Enumerate Cloudflare Pages projects**

Run:

```bash
npx --yes wrangler@latest pages project list
```

Expected: a list of Pages projects or an authenticated response indicating none exist.

Record any project whose custom domains, name, or production URL can be tied to `productweld.tech`.

- [ ] **Step 3: Inspect the Cloudflare dashboard for the zone and production binding**

Using the authenticated Cloudflare dashboard, open the `productweld.tech` zone and record, without editing:

1. the DNS record(s) serving the apex and `www` if present;
2. whether the domain is bound to Pages, Workers, a proxied external origin, or another Cloudflare surface;
3. the exact Pages project or Worker/service name if applicable;
4. the most recent production deployment timestamp;
5. the production deployment commit SHA / Git repository metadata if Cloudflare displays it;
6. the current custom-domain binding;
7. any route pattern that serves the apex.

Do not save or modify any dashboard setting.

- [ ] **Step 4: Cross-check Cloudflare metadata against GitHub candidates**

If Cloudflare exposes a repository and commit SHA, run:

```bash
gh api repos/OWNER/REPO/commits/COMMIT_SHA \
  --jq '{sha: .sha, html_url: .html_url, committed: .commit.committer.date, message: .commit.message}'
```

Expected: GitHub resolves the exact deployment commit. If it does not, the candidate remains unproven.

- [ ] **Step 5: Write the Cloudflare mapping report**

Create `projects/productweld/site-v2/evidence/source-reconciliation/cloudflare-mapping.md` with these exact headings:

```markdown
# Cloudflare Production Mapping

## Authentication evidence
## Zone and DNS mapping
## Delivery surface
## Project or Worker identity
## Production custom-domain binding
## Most recent production deployment
## Git repository / commit metadata
## Cross-check against GitHub candidates
## Unresolved blockers
## Production changes made
```

`## Production changes made` must state `None` for this plan to continue.

- [ ] **Step 6: Commit the Cloudflare mapping evidence**

```bash
git add projects/productweld/site-v2/evidence/source-reconciliation/cloudflare-mapping.md
git commit -m "docs: map ProductWeld Cloudflare production source"
```

---

### Task 5: Prove or reject an existing production-backed repository

**Files:**
- Modify: `projects/productweld/site-v2/evidence/source-reconciliation/github-candidates.md`

**Interfaces:**
- Consumes: Cloudflare production metadata and GitHub candidates.
- Produces: exactly one `PROVEN` existing source or a documented conclusion that no recoverable production source exists.

- [ ] **Step 1: Apply the provenance proof rule**

An existing repository is `PROVEN` only when at least one of these is true:

1. Cloudflare production metadata names that exact Git repository and deployment commit; or
2. Cloudflare exposes a deployment artifact that can be tied to a Git commit in the repository; or
3. a clean checkout of a specific repository commit produces the same production asset fingerprints and HTML structure, with no contradictory Cloudflare metadata.

Anything weaker remains `POSSIBLE` or `REJECTED`.

- [ ] **Step 2: If Cloudflare names an exact Git commit, verify it exists and is reachable**

Run:

```bash
gh api repos/OWNER/REPO/commits/COMMIT_SHA --jq '.sha'
gh api repos/OWNER/REPO/branches --paginate --jq '.[].name'
```

Expected: the exact commit resolves. Record whether it is reachable from the default branch or only from another ref.

- [ ] **Step 3: If no deployment commit is exposed, compare a candidate build only after identifying its documented build command**

Read the candidate's package manifest and deployment workflow. Use the repository's own lockfile and documented build command; do not substitute package managers or invent a build step.

After a clean build, compare fingerprintable public asset basenames and static HTML structure against `live-baseline/assets.txt` and `live-baseline/index.html`. Record commands and results in `github-candidates.md`.

- [ ] **Step 4: Normalize the final candidate dispositions**

Update `github-candidates.md` so that either:

- exactly one repository is `PROVEN`; or
- zero repositories are `PROVEN`, with a concise reason why each candidate failed the proof rule.

Run:

```bash
grep -c 'Disposition: PROVEN' \
  projects/productweld/site-v2/evidence/source-reconciliation/github-candidates.md
```

Expected: `1` for recovery path or `0` for new-repository path. Any value greater than `1` is a failed reconciliation and must be resolved before continuing.

- [ ] **Step 5: Commit the proven candidate disposition**

```bash
git add projects/productweld/site-v2/evidence/source-reconciliation/github-candidates.md
git commit -m "docs: finalize ProductWeld source provenance disposition"
```

---

### Task 6: Establish the authoritative application repository without touching production

**Files:**
- Conditionally create or modify in resolved application repository: `docs/productweld-source-provenance.md`
- Create later in Canon: `projects/productweld/site-v2/evidence/source-reconciliation/source-decision.json`

**Interfaces:**
- Consumes: proven candidate count and Cloudflare mapping.
- Produces: one authoritative application repository suitable for downstream v2 planning.

- [ ] **Step 1: Choose the source path from evidence, not preference**

Run:

```bash
PROVEN_COUNT=$(grep -c 'Disposition: PROVEN' \
  projects/productweld/site-v2/evidence/source-reconciliation/github-candidates.md || true)
printf '%s\n' "$PROVEN_COUNT"
```

Expected: `0` or `1`.

If `1`, follow the recovery path. If `0`, follow the new-canonical-source path.

- [ ] **Step 2A: Recovery path — create a non-production provenance branch in the proven repository**

Run:

```bash
gh repo clone OWNER/REPO /tmp/productweld-recovered
cd /tmp/productweld-recovered
git fetch --all --tags
git switch --create chore/productweld-v2-provenance COMMIT_SHA
mkdir -p docs
```

Create `docs/productweld-source-provenance.md` recording:

- canonical domain `productweld.tech`;
- Cloudflare delivery surface and exact project/worker name;
- verified production deployment commit;
- evidence path in Canon;
- statement that no production routing or deployment changed during reconciliation;
- statement that future v2 implementation branches must derive from the verified source lineage or an explicitly approved migration commit.

Commit and push only this non-production branch:

```bash
git add docs/productweld-source-provenance.md
git commit -m "docs: record ProductWeld production provenance"
git push -u origin chore/productweld-v2-provenance
```

Do not merge this branch and do not deploy it in this plan.

- [ ] **Step 2B: New-canonical-source path — create a private repository with no Cloudflare binding**

First confirm the name is still unused:

```bash
if gh repo view Full-Stack-Assets/ProductWeld >/dev/null 2>&1; then
  echo "Full-Stack-Assets/ProductWeld already exists; stop and inspect it before proceeding" >&2
  exit 1
fi
```

Create the private repository:

```bash
gh repo create Full-Stack-Assets/ProductWeld \
  --private \
  --description "Canonical source for ProductWeld.tech" \
  --clone
cd ProductWeld
```

Create `README.md` with:

```markdown
# ProductWeld

Canonical source repository for ProductWeld.tech v2.

Production traffic is not connected to this repository until a separately approved Cloudflare cutover.
```

Create `docs/productweld-source-provenance.md` recording:

- the existing `productweld.tech` production source could not be proven to a recoverable Git repository;
- Canon evidence path for that conclusion;
- the current Cloudflare project/worker identity serving production;
- this repository is the new authoritative source for v2 development only;
- production remains unchanged until a separately approved cutover.

Commit and push:

```bash
git add README.md docs/productweld-source-provenance.md
git commit -m "chore: initialize canonical ProductWeld source"
git push -u origin main
```

Do not add a Cloudflare custom domain, Worker route, Pages project, deployment token, or production secret in this plan.

- [ ] **Step 3: Record the exact authoritative repository and ref**

Run in the authoritative application repository:

```bash
printf 'repository=%s\n' "$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
printf 'commit=%s\n' "$(git rev-parse HEAD)"
```

Expected: one `Full-Stack-Assets/...` repository and one 40-character commit SHA.

---

### Task 7: Write and machine-validate the canonical source decision

**Files:**
- Create: `projects/productweld/site-v2/evidence/source-reconciliation/source-decision.json`
- Create: `projects/productweld/site-v2/SOURCE-OF-TRUTH.md`

**Interfaces:**
- Consumes: authoritative application repository/ref, Cloudflare mapping, baseline production hash.
- Produces: machine-validated Canon receipt and human-readable relationship record.

- [ ] **Step 1: Recapture production after repository establishment**

From the Canon repository root:

```bash
rm -rf /tmp/productweld-after
bash tools/productweld/source-fingerprint.sh productweld.tech /tmp/productweld-after
cat /tmp/productweld-after/index.sha256
```

Expected: the hash equals `live-baseline/index.sha256`. If it differs, stop and investigate before claiming no production mutation.

- [ ] **Step 2: Create the machine-readable decision receipt with actual observed values**

Create `projects/productweld/site-v2/evidence/source-reconciliation/source-decision.json` containing exactly these keys:

```json
{
  "domain": "productweld.tech",
  "decision": "RECOVER_EXISTING_SOURCE",
  "sourceRepository": "Full-Stack-Assets/example",
  "sourceRef": "main@0123456789abcdef0123456789abcdef01234567",
  "cloudflareSurface": "PAGES",
  "cloudflareProject": "productweld-production",
  "productionHtmlSha256Before": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "productionHtmlSha256After": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "productionMutated": false,
  "evidencePaths": [
    "projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/index.sha256",
    "projects/productweld/site-v2/evidence/source-reconciliation/github-candidates.md",
    "projects/productweld/site-v2/evidence/source-reconciliation/cloudflare-mapping.md"
  ],
  "verifiedAt": "2026-08-27T00:00:00Z"
}
```

The values shown above are schema examples, not values to copy. Replace every repository, ref, Cloudflare surface/project, hash, decision enum, and timestamp with the actual observed values from Tasks 2–6. Use `CREATE_NEW_CANONICAL_SOURCE` when the new-repository path was required.

- [ ] **Step 3: Validate the decision receipt**

Run:

```bash
python tools/productweld/validate_source_decision.py \
  projects/productweld/site-v2/evidence/source-reconciliation/source-decision.json
```

Expected: `source decision receipt valid`.

- [ ] **Step 4: Create the Canon relationship record**

Create `projects/productweld/site-v2/SOURCE-OF-TRUTH.md` with these exact sections and actual values from the receipt:

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

The authority boundary must state that Canon remains authoritative for policy/evidence/receipts, the application repository is authoritative for site source, and Cloudflare is the delivery layer. It must also state that DNS cutover and production deployment remain Human Authority-gated.

Under `## Next implementation plans`, list these five follow-on plans in order:

1. Public shell, design system, navigation, and core routes.
2. Venture evidence registry and evidence-backed content.
3. Acquire route and public Acquisition Financeability sample report.
4. Intake forms, analytics, SEO, accessibility, performance, and security hardening.
5. Cloudflare deployment, domain cutover, release verification, and rollback.

- [ ] **Step 5: Commit the decision and relationship record**

```bash
git add projects/productweld/site-v2/evidence/source-reconciliation/source-decision.json \
  projects/productweld/site-v2/SOURCE-OF-TRUTH.md
git commit -m "docs: establish ProductWeld source of truth"
```

---

### Task 8: Run the reconciliation acceptance gate

**Files:**
- Modify only if needed to fix validation failures from prior tasks.

**Interfaces:**
- Consumes: all reconciliation evidence and source decision.
- Produces: a clear PASS/FAIL gate for downstream implementation planning.

- [ ] **Step 1: Run the reconciliation tool tests**

```bash
python -m pytest tests/productweld/test_source_reconciliation_tools.py -v
```

Expected: all tests PASS.

- [ ] **Step 2: Validate the final receipt again**

```bash
python tools/productweld/validate_source_decision.py \
  projects/productweld/site-v2/evidence/source-reconciliation/source-decision.json
```

Expected: `source decision receipt valid`.

- [ ] **Step 3: Assert production stayed byte-identical at the HTML level during reconciliation**

```bash
BEFORE=$(cat projects/productweld/site-v2/evidence/source-reconciliation/live-baseline/index.sha256)
AFTER=$(python - <<'PY'
import json
from pathlib import Path
p = Path("projects/productweld/site-v2/evidence/source-reconciliation/source-decision.json")
print(json.loads(p.read_text())["productionHtmlSha256After"])
PY
)
test "$BEFORE" = "$AFTER"
printf 'production html unchanged: %s\n' "$AFTER"
```

Expected: command exits 0 and prints the shared SHA-256.

- [ ] **Step 4: Assert exactly one authoritative repository is recorded**

```bash
python - <<'PY'
import json
from pathlib import Path
p = Path("projects/productweld/site-v2/evidence/source-reconciliation/source-decision.json")
d = json.loads(p.read_text())
assert d["sourceRepository"].count("/") == 1
assert d["sourceRepository"].startswith("Full-Stack-Assets/")
print(d["sourceRepository"], d["sourceRef"])
PY
```

Expected: one repository and ref print successfully.

- [ ] **Step 5: Verify the Canon branch is clean after committing evidence**

```bash
git status --short
```

Expected: no output.

- [ ] **Step 6: Open a draft Canon PR for the reconciliation evidence**

Run:

```bash
gh pr create \
  --repo Full-Stack-Assets/Canon \
  --base design/productweld-tech-v2-spec \
  --head plan/productweld-tech-v2-source-reconciliation \
  --draft \
  --title "docs: reconcile ProductWeld.tech production source" \
  --body "Establishes the evidence-backed ProductWeld.tech source-of-truth decision without changing production. Downstream v2 implementation planning remains blocked until this reconciliation gate passes and Human Authority approves execution of the next plan."
```

Expected: a draft PR URL.

---

## Plan Self-Review

### Spec coverage

This plan directly covers the design specification's first implementation dependency: identify the actual Cloudflare production source, determine whether Git provenance is recoverable, establish one authoritative application repository, preserve Cloudflare as delivery by default, and make no production cutover during reconciliation.

The remaining spec is intentionally decomposed into five downstream plans because the exact application paths, build tooling, and tests cannot be named honestly until this plan resolves the source repository and source ref.

### Placeholder scan

No implementation step uses `TBD`, `TODO`, "implement later", "add appropriate handling", or "similar to Task N". Example JSON in Task 7 is explicitly labeled as schema-only and requires replacement with observed values before validation can pass.

### Type and interface consistency

The receipt validator and Task 7 JSON use the same required field names:

- `domain`
- `decision`
- `sourceRepository`
- `sourceRef`
- `cloudflareSurface`
- `cloudflareProject`
- `productionHtmlSha256Before`
- `productionHtmlSha256After`
- `productionMutated`
- `evidencePaths`
- `verifiedAt`

The baseline and final verification both use SHA-256 of the live root HTML collected by the same script, preventing mixed-fingerprint comparisons.

## Completion Gate

This plan is complete only when all of the following are true:

1. the live `productweld.tech` baseline is captured;
2. all plausible GitHub candidates are dispositioned;
3. the authenticated Cloudflare delivery surface is mapped;
4. exactly one authoritative application repository exists;
5. `source-decision.json` passes machine validation;
6. the before/after production HTML hash is unchanged;
7. no DNS, Cloudflare route, deployment, billing, or public-content mutation occurred;
8. Canon records the application repository, source ref, Cloudflare surface, and authority boundary.

Only after this gate clears should the next ProductWeld.tech v2 implementation plan be written against the resolved application repository.