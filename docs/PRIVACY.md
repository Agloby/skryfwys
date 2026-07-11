# Privacy

## Plain-language promise

Skryfwys does not need an external AI provider to check spelling and its supported
deterministic rules. Submitted text is not saved or written to diagnostic logs by
default. A user must make a deliberate, visible choice before text can be sent to a
third-party model provider.

## Privacy modes

| Mode | Where text is processed | Third-party AI | Intended use |
| --- | --- | --- | --- |
| Local | The user's Skryfwys process/device boundary | Never | Most private; core check and deterministic rewrite |
| Private server | The explicitly configured self-hosted server | Off unless separately enabled | Teams controlling their own infrastructure |
| Cloud AI | Skryfwys server plus the named configured provider | Only after explicit consent/action | Optional generative rewrite or secondary review |

The web interface shows the active mode in text and icon form. Changing to cloud
AI must show the provider (when known), describe that selected content leaves the
Skryfwys boundary, and remain reversible. Selecting a mode is not blanket consent
to save documents or train a model.

## Data handled

### Transient by default

- text submitted for checking, lookup context, or rewriting;
- protected-span/redacted intermediate representations;
- generated issues and rewrite output returned to the requesting client.

### Stored when the feature is used

- personal terms, alternatives, categories, notes, locale, and case preference;
- ignored rule identifiers and display preferences;
- privacy consent state where needed to prevent accidental cloud requests.

### Opt-in only

- document/correction history and its contents;
- external AI processing;
- diagnostics beyond metadata required for operation.

## Diagnostic metadata

Default operational records may contain a random request ID, time, route, status,
duration, input character count, issue count, privacy mode, provider/model label,
and estimated cost. They must not contain request bodies, text snippets, term
definitions, prompts, authorization values, cookies, or model output.

## External providers

When cloud AI is enabled, the deployment operator must identify the configured
provider, base URL, region/retention terms, and its privacy agreement to users.
Skryfwys itself does not assert that every OpenAI-compatible endpoint has the same
privacy guarantees. User text is sent only for the requested operation and must
not be opted into training by Skryfwys configuration.

## User controls

The local product provides terminology inspection and deletion/export paths where
those records exist. A future authenticated service must additionally support a
complete machine-readable export and deletion of account, preferences, terms, and
opt-in history. Backup retention may delay physical deletion and must be disclosed
by that deployment's operator.

## Deployment responsibilities

Self-hosters are data controllers for their users: they select hosting location,
TLS, access policy, retention, backups, and any AI provider. Public deployments
need an organisation-specific privacy notice and legal review; this project
document is technical guidance, not legal advice.
