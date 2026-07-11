# Office Add-in

`apps/office-addin` contains a Word/Outlook task-pane foundation that calls the
Skryfwys API, displays check results, and applies selected replacements through
host adapters. The correction utilities include tests for Unicode offsets and
stale selection protection.

Verified on 2026-07-11 from a local temporary copy:

```powershell
npm ci
npm run typecheck
npm test
npm run build
```

The build produced task-pane assets and copied both manifests. A live Microsoft
Word/Outlook sideload session was not available on this host, so real host
behavior, store packaging, and formatting preservation remain target-platform
verification items. The first implementation prioritizes plain-text safety; rich
inline formatting can still be lost when a host replacement falls back to selected
text insertion.
