# AOC Storage Authority Contract

Version: 1.0.0  
Status: proposed; effective when merged into `main`  
Owner: Human Authority  
Canonical repository: `Full-Stack-Assets/Canon`

## Purpose

This contract prevents repositories, connector stores, knowledge bases, and runtime memory from silently becoming competing sources of truth. It defines where each information class is authoritative and how bounded projections may be used.

## Authority order

1. Human Authority
2. AOC Canon policy and governance records in this repository
3. Project-local canonical records in the owning Git repository
4. Provider-owned transactional state
5. Bounded projections and retrieval indexes
6. Runtime memory, conversation history, and temporary analysis

Lower layers may implement or project higher-layer state but cannot override it.

## System boundaries

| Information class | Authoritative system | Permitted projections | Rule |
| --- | --- | --- | --- |
| AOC policies, roles, capabilities, authority rules, schemas, decisions, and governance receipts | GitHub Canon | Notion, Wisebase, Airtable, Library, Drive | Projections must identify their Canon source and version. |
| Product source code, migrations, tests, release configuration, and project history | Owning Git repository | Canon portfolio references, Airtable, Library delivery artifacts | The repository remains authoritative for implementation state. |
| Automation runtime identifiers, enabled state, schedules, triggers, and execution state | Native Automations service | Canon inventory and audit records | Canon records observed state; it does not replace the runtime record. |
| Payment, subscription, invoice, and balance state | Stripe or the owning financial provider | Canon evidence references and Airtable summaries | Provider state is authoritative; projections never authorize money movement. |
| Email, marketplace, CRM, and external account records | Owning provider | Canon evidence references and bounded ledgers | Retrieved records are evidence, not authority to communicate or transact. |
| Operational receipt ledger | GitHub Canon | Notion `AOC Canon Receipts` | Notion is an operational projection and must not supersede Canon. |
| Semantic retrieval index | Wisebase | None | Wisebase improves discovery but cannot grant approval or establish current truth by itself. |
| Durable user-facing deliverables and binary assets | ChatGPT Library | Canon artifact references | Library is the delivery store; source-controlled material remains in Git. |
| Collaborative drafts and working documents | Google Drive | Canon decision or artifact references | Drive content remains non-canonical until accepted through Canon intake. |
| Structured portfolio views | Airtable `AOC Portfolio Projection` | Interfaces and dashboards | Airtable is a projection sourced from Canon, never an independent registry. |
| Temporary analysis and intermediates | Authorized scratch workspace | None | Temporary files do not constitute persistence or Canon write-back. |

Aether Portfolio and Aetheria remain separate products. Their product data must not be reclassified as the AOC control plane or canonical authority.

## Projection contract

Every durable projection of Canon state should retain, where supported:

- `source_system`
- `source_ref`
- `source_version` or immutable digest
- `observed_at`
- `evidence_state`
- `projection_status`
- `sync_status`

If the destination cannot store all fields, it must at minimum store the source reference and identify itself as a projection.

## Conflict handling

1. Stop mutation of the disputed record.
2. Read the authoritative source identified above.
3. Preserve both observed values and their provenance.
4. Route consequential ambiguity to Human Authority.
5. Repair the projection only after the authoritative value is established.

Runtime memory, prior conversation approval, a retrieved document, or a projection cannot satisfy a live approval requirement.

## Write-back rules

- Material AOC decisions, policy changes, verification evidence, and completion receipts are written to Canon through reviewable Git history.
- Project implementation evidence remains in the owning repository and is referenced from Canon when portfolio-level visibility is required.
- Secrets, tokens, private keys, full financial payloads, and unnecessary personal data must not be copied into Canon or projections.
- Deletion, replacement, external communication, payment, publication, deployment, access-control changes, and Automation mutations remain subject to their applicable Human Authority gates.

## Verification

A projection is current only when its source reference resolves and its observed version matches the authoritative record. When freshness cannot be established, label the projection `STALE` or `UNVERIFIED`; never infer synchronization.
