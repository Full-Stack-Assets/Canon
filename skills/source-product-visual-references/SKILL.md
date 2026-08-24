"---
name: source-product-visual-references
description: Source and verify named fashion or product image references from Google Images discovery and official, reputable retailer, or credible archive landing pages. Use when an inventory row needs a Selected Visual Reference URL, optional Direct Image URL, match class, status, and review notes; do not use to manufacture generic placeholders or generated imagery.
---

# Source Product Visual References

Find a defensible visual reference for a named product and preserve the page that proves the match. Treat search engines as discovery tools only. A thumbnail, search-result URL, snippet, or visual resemblance by itself is not verification.

## Triage the row

Inspect the product name, brand, model or family, color, material, style identifier, sourcing classification, exact query, and any canonical reference.

- If the classification is `Generic/Unbranded`, do not automate sourcing. Keep it `Manual Only / Omitted`; do not add a placeholder that looks complete.
- Keep alternatives as separate records. Do not let a substitute inherit the original item's evidence or match class.
- For ambiguous, custom, vintage, or archival items, use bounded research and retain uncertainty. Never promote similarity to an exact match.

## Discover and verify

1. Open the row's Google Images link. If it is absent, run the Exact Search Query in Google Images. Use the results only to find candidate landing pages.
2. Prefer candidates in this order:
   - the official brand's exact product page;
   - an established retailer product page, such as Farfetch, SSENSE, END., MR PORTER, or another retailer with reliable product metadata;
   - a credible archive or resale listing only when the item is vintage, discontinued, or otherwise unavailable through stronger sources.
3. Visit the candidate landing page. Do not select a Google or Bing result URL, cached thumbnail, Pinterest pin, social post, or image aggregator.
4. Compare the page with the inventory row and any canonical reference. Check the brand and title, model or product family, SKU or style code when available, colorway, material or hardware, and visual details. Assess source authority, page stability, and any rights or usage context.
5. Fail closed when the evidence is incomplete or conflicting: leave the selection unverified, explain what is unresolved, and do not assign an exact class.

## Record the result

- `Selected Visual Reference URL`: copy the visited product or archive landing-page URL. This is the primary provenance record.
- `Direct Image URL`: optional. Copy the image address from the verified page only when it is a stable `http` or `https` URL. Leave it blank for `blob:`, `data:`, cached-search, session-bound, or visibly expiring URLs.
- `Match Class`: use only `official_exact`, `retailer_exact`, or `archive_reference`, following the acceptance rules in [references/output-contract.md](references/output-contract.md).
- `Reference Status`: preserve the inventory's existing status vocabulary and only apply its verified status after the landing page has been inspected.
- `Review Notes`: name the evidence used, any identifier or color confirmation, and every limitation. A direct image URL is a pointer, not a license; note unclear rights or usage conditions.

Read [references/output-contract.md](references/output-contract.md) before producing structured records or updating a workbook. Run `scripts/validate_reference_record.py` on completed JSON or JSONL records when deterministic structural validation is useful. Semantic product identity still requires page review.

"