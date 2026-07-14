# Office Add-in

`apps/office-addin` contains a Word/Outlook task-pane foundation that calls the
Skryfwys API, displays check results, and applies selected replacements through
host adapters. The correction utilities include tests for Unicode offsets and
stale selection protection.

Verified on 2026-07-14 from a local temporary copy:

```powershell
npm ci
npm run typecheck
npm test
npm run build
npm run validate-manifests
```

The build produced task-pane assets and copied both manifests. Word desktop was
configured through a trusted shared-folder add-in catalog at:

```text
\\KSN-FS\RedirectedFolders$\ArmandM\My Documents\Afrikaans AI Writing Assistant\apps\office-addin
```

The Word add-in was manually smoke-tested on this workstation with selected text
and confirmed working. The local task-pane server must be running at
`https://localhost:3001`, and the Skryfwys API must be running at
`http://127.0.0.1:8000`, while using the local development manifest.

Outlook manifest validation passed, but a live Outlook compose-mode smoke test is
still pending. Store packaging, managed deployment, and broader host/version
testing remain release work. The first implementation prioritizes plain-text
safety; rich inline formatting can still be lost when a host replacement falls
back to selected text insertion.
