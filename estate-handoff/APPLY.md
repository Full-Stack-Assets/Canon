# Project Estate bundles — apply locally

These are thin git bundles. They do not contain full history. Fetch them into an existing clone of the matching repo, then push the named branch.

| Bundle | Tip | Branch |
|---|---|---|
| branch_bundles/Canon-project-estate-intake.bundle | 69c4a8c5aaff6365fce350ece5b1a6313c7cc15a | codex/project-estate-intake-2026-08-29 |
| branch_bundles/Po-python-build-repair.bundle | 166470ddc86e6631ae1b2cd260e9137c12e5954d | codex/lock-and-repair-python-build |
| branch_bundles/Tradewind-postgres-fk.bundle | 263e6609eac457eca8f8e5e28b4839d2b98d80f2 | codex/fix-control-plane-current-envelope-fk |
| branch_bundles/AstroKobi-editorial-gate.bundle | de8b426c885a7936d38dfb05e84a6a7c8a4c3e2f | codex/editorial-promotion-gate |

Example:

```bash
git fetch path/to/Canon-project-estate-intake.bundle codex/project-estate-intake-2026-08-29
git push origin codex/project-estate-intake-2026-08-29
```

Do not force-push. Human authority still owns merge to default branches.
