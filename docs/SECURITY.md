# Security

## Security posture

Skryfwys processes text that may contain private, commercially sensitive, legal,
or personal information. The secure default is a deterministic local deployment
with no external model provider and no document history. This document describes
required controls and the checks available in this repository; it is not a claim
of independent penetration testing.

## API boundary

- Validate every request and response with typed models. Unknown privacy/rewrite
  modes, malformed JSON, invalid offsets, and excessive fields are rejected.
- Enforce both `Content-Length` and actual body-size limits. Reverse proxies must
  repeat the limit rather than relying only on the application.
- Apply request throttling by client boundary. The in-process limiter is suitable
  for one local instance; multi-instance production must use a shared limiter.
- Configure an explicit CORS allowlist. Wildcard origins must never be combined
  with credentials.
- Send `X-Content-Type-Options: nosniff`, a restrictive referrer policy, frame
  protection/CSP where appropriate, and avoid reflecting submitted text in errors.
- `/docs` and diagnostic detail should be disabled or access-controlled on public
  deployments.

## Authentication and sessions

The first local release is guest-oriented and does not claim complete user-account
support. When accounts are enabled in a later release:

- hash passwords with Argon2id using a maintained library;
- use opaque, rotated server-side sessions in `Secure`, `HttpOnly`, `SameSite=Lax`
  cookies;
- require anti-CSRF tokens for state-changing cookie-authenticated requests;
- rate-limit login/reset routes and avoid account-existence disclosure;
- scope every terminology/history query by the authenticated owner;
- provide tested export and deletion workflows.

Bearer tokens must not be stored in browser `localStorage` for the web client.

## AI/provider safeguards

- Document text is delimited and described as untrusted data; instructions inside
  it never replace gateway policy.
- Only explicit cloud-AI consent plus configured provider credentials may trigger
  an external call. Local and private-server checking cannot do so accidentally.
- Model output is parsed into a bounded schema. Unexpected fields, invalid spans,
  excessive output, factual-span changes, or parse failure cause rejection/fallback.
- Timeouts, bounded retry/backoff, input-character limits, and daily budget controls
  prevent runaway use.
- Names, amounts, dates, measurements, URLs, emails, and requested quoted text are
  protected before accepting a rewrite.
- Logs contain provider, model, duration, token/cost estimate, request ID, and
  outcome—not the prompt or document.

## Storage and secrets

- `.env*`, databases, coverage output, build output, and credentials are ignored.
- Environment variables or a deployment secret manager provide credentials; never
  put API keys in Vite variables because client bundles are public.
- SQLite files and backups need OS-level permissions. Shared deployments use
  PostgreSQL with TLS, a least-privilege application role, encrypted backups, and
  regularly tested restore procedures.
- Submitted document text is not persisted unless the separate history feature is
  deliberately enabled. Personal terms may contain sensitive company vocabulary,
  so exports and database backups receive the same protection as documents.

## Client-side safety

- Render text as text, not unsanitised HTML. Diff/highlight views derive nodes from
  trusted offsets and React escaping.
- Verify `currentText.slice(start, end) === issue.original` before replacement.
- Apply non-overlapping safe fixes from right to left; never auto-apply a low-
  confidence or AI-only suggestion.
- Browser scripts exclude passwords, payment/autocomplete-sensitive controls,
  explicitly disabled sites, and fields without a deliberate check action.
- Office replacements remain selection/range scoped so Word's own undo is usable.
- iOS keyboard work never records keystrokes and external checking remains an
  explicit action subject to Apple's secure-field restrictions.

## Dependency and source checks

Recommended CI gates are:

```text
python -m ruff check .
python -m pip_audit
npm audit --omit=dev --prefix apps/web
gitleaks detect --no-banner --redact
```

`pip-audit` and `gitleaks` are optional developer tools and must be installed by the
CI security job. A reported vulnerability is assessed against actual reachability;
required failures are not suppressed merely to make CI green.

## Reporting vulnerabilities

Do not open a public issue containing exploit details or private text. Contact the
repository owner privately with the affected version, reproduction, impact, and a
redacted example. Rotate exposed credentials immediately and preserve metadata-only
audit evidence for incident review.
