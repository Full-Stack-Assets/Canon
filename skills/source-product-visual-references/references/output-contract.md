"# Output contract

Use the inventory row as the identity contract. The source page must prove the recorded class; visual resemblance alone is insufficient.

## Input fields

Use the available values from these columns:

| Field | Use |
| --- | --- |
| `Item ID` | Stable record key. |
| `Item Spec (atomic)` | Human-readable identity to verify. |
| `Brand` | Brand or maker. |
| `Model / Product Family` | Exact model or bounded family. |
| `Color`, `Material`, `Style / Identifier` | Match constraints. |
| `Sourcing Classification` | Exact Model, Product Family, Vintage/Archival, Ambiguous/Custom, or Generic/Unbranded. |
| `Exact Search Query`, `Google Images` | Discovery inputs, never verification evidence. |
| `Official Search`, `Canonical Reference URL` | Identity anchors; they do not automatically approve a candidate image. |

## Output fields

Return these field names exactly:

| Field | Requirement |
| --- | --- |
| `Selected Visual Reference URL` | Required for a verified reference. Must be the visited landing page, not a search result or direct image. |
| `Direct Image URL` | Optional stable `http` or `https` image address copied from the verified page. |
| `Match Class` | Required for a verified reference; use one class from the table below. |
| `Reference Status` | Preserve the current project's status vocabulary. `Verified Pilot` is a historical value in Inventory v2.1, not a universal default. |
| `Review Notes` | Required. State the confirming evidence, unresolved differences, page stability, and rights/use limitations when relevant. |

## Match classes

| Match class | Accept only when |
| --- | --- |
| `official_exact` | An official brand product page supports the same named item and relevant exact attributes, such as model or style identifier and colorway. |
| `retailer_exact` | An established retailer product page supports the same named item and relevant exact attributes. A retailer name alone is not enough. |
| `archive_reference` | A credible archive or resale page is the best available reference for a vintage, archival, or discontinued item. Do not imply exact SKU-level proof that the page does not provide. |

Do not invent additional classes. If no class is supported, do not force a match. Keep the record unresolved under the project's existing status rules and describe the missing evidence.

## URL acceptance

- Accept only `http` or `https` URLs.
- The selected URL must resolve to the inspected product, retailer, or archive page.
- Reject Google/Bing search and image-result URLs, cached thumbnails, Pinterest pins, social posts, and image aggregators as selected references.
- Reject direct image URLs using `blob:` or `data:` schemes, session-only access, or obvious expiring signatures. It is valid to leave `Direct Image URL` blank.
- Do not infer permission to download, publish, or redistribute an image from URL availability.

## Completed record example

```json
{
  "Item ID": "OUT-001-ITEM-02",
  "Sourcing Classification": "Exact Model",
  "Selected Visual Reference URL": "https://brand.example/products/named-model-blue",
  "Direct Image URL": "https://images.brand.example/named-model-blue-front.jpg",
  "Match Class": "official_exact",
  "Reference Status": "Verified",
  "Review Notes": "Official product page confirms model name, style code, and blue colorway; direct image is a reference pointer only."
}
```

For `Generic/Unbranded` or `Manual Only / Omitted` rows, leave both URLs and `Match Class` blank and explain the omission in `Review Notes`.

"