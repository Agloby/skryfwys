# Skryfwys browser extension

This is a dependency-free Manifest V3 extension for current Chrome and Edge releases. It
checks an explicitly selected editable field against the same Skryfwys API as the web app.
There is no background checking: field text leaves the page only after the user clicks the
Skryfwys button, uses the extension popup, or invokes the configured keyboard shortcut.

## Load it locally

1. Start the API on `http://127.0.0.1:8000`.
2. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
3. Enable **Developer mode**, choose **Load unpacked**, and select this directory.
4. Focus a normal text field and click the small **Sk** button.

The default **local-only** setting accepts only loopback, RFC 1918, link-local, or `.local`
API hosts and always sends `privacy_mode: "local"`. To use a remote self-hosted server,
disable local-only mode, choose `private-server`, and grant the host permission when the
options page asks. Cloud AI remains an explicit setting.

The shortcut defaults to `Ctrl+Shift+Y` (`Command+Shift+Y` on macOS) and can be changed on
the browser's extension-shortcut page.

## Privacy and safety boundaries

- Password, one-time-code, payment-card, PIN, and fields in likely secure/payment forms are
  excluded using type, autocomplete, label/name, and form metadata.
- The manifest declares `incognito: not_allowed`; the service worker also rejects messages
  from incognito tabs as a second guard.
- Disabled sites are stored as origins, not browsing history. Checked text and API results
  are never written to extension storage.
- Corrections are applied only if the field still exactly matches the snapshot that was
  checked. Contenteditable replacements use DOM ranges so surrounding markup is retained.
- Browser heuristics cannot identify every bespoke payment editor. Users should disable the
  extension for sensitive sites, and managed deployments should use enterprise allowlists.

## Tests

```powershell
npm test --prefix apps/browser-extension
```

The Node tests cover URL/privacy and sensitive-field decisions. Full browser automation is
not included yet; manual Chrome and Edge smoke testing is still required before publishing.

