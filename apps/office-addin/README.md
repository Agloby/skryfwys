# Skryfwys Office task pane

This Office.js foundation supports Word first and reuses the API client and correction
rendering for an Outlook compose-mode add-in. It reads only the current selection after the
user chooses **Kontroleer**. No document text is collected in the background.

## Local HTTPS development

Prerequisites: Node.js 22.15+, Microsoft Word desktop or Word on the web, and the Skryfwys API
on `http://127.0.0.1:8000`.

```powershell
npm install --prefix apps/office-addin
npm run dev --prefix apps/office-addin
```

On first run, `office-addin-dev-certs` asks to install a trusted localhost development
certificate. The webpack server exposes `https://localhost:3001` and proxies `/api` to the
HTTP API, avoiding mixed-content requests from Office.

### Sideload in Word

1. Keep the HTTPS dev server and API running.
2. Word desktop: **Insert > Get Add-ins > My Add-ins > Upload My Add-in** (the wording varies
   by Office release), then choose `manifest.word.xml`.
3. Word on the web: open a test document, choose **Home > Add-ins > More Add-ins > My
   Add-ins > Upload My Add-in**, and select the same manifest.
4. Select a sentence, open Skryfwys, and choose **Kontroleer**.

Word range replacement is used when the issue text occurs exactly once inside the selected
range. If it is ambiguous, the add-in reconstructs and replaces the selected text only. The
selection is re-read immediately before every change, so a stale suggestion cannot overwrite
new text. Word records the edit in its normal undo stack. The whole-selection fallback can
flatten inline formatting within that selection; the task pane therefore uses it only when
Office.js cannot identify a unique matching range.

### Outlook development manifest

`manifest.outlook.xml` is a compose-mode foundation. Sideload it through Outlook's add-in
management UI, open a new message, select text in the body, and use the task pane. Outlook's
selected-data API replaces the selected text as a whole; it does not expose Word-style
character ranges. Availability varies by Outlook client and Mailbox requirement-set support,
so this path must be tested in each target client before release.

## Configuration and verification

The empty API-address setting means “same origin” and is correct for the local proxy. A
deployed task pane should also reverse-proxy `/api` on its own HTTPS origin. If a separate API
origin is used, it must be HTTPS and explicitly present in the backend CORS allowlist.
Cloud-AI mode is not remembered as consent: the task pane shows the external-provider boundary
and requires a fresh acknowledgement after each task-pane load before the first cloud check.

```powershell
npm run typecheck --prefix apps/office-addin
npm test --prefix apps/office-addin
npm run build --prefix apps/office-addin
npm run validate-manifests --prefix apps/office-addin
```

The manifest validator and browser-based build do not prove that Word/Outlook accepted the
manifest or that a real selection was replaced. Use `test/office-smoke-test.txt` for manual
host testing. This repository was generated on Windows without automating an installed Office
client, so host smoke tests remain an explicit release gate.
