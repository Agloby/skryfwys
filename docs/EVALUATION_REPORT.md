# Evaluation Report

Last regenerated on 2026-07-11 with:

```powershell
python -m services.language_engine.evaluation
```

The deterministic seed suite passed its quality gates:

- 475 generated cases plus 13 explicit seed cases
- 100 accepted, 100 spelling, 100 grammar/punctuation, 50 compound,
  50 code-switching, 50 formal/informal, and 25 construction cases
- offset verification passed
- labelled-rule recall and precision were 1.0 on this project-authored suite
- AI cost was 0 because evaluation uses local deterministic checks only

These numbers are regression evidence for the original seed suite. They are not
a claim of broad real-world Afrikaans accuracy or independent-corpus coverage.
The machine-readable output is stored in `data/evaluation/report.json`; the
human-readable generated report is stored in `data/evaluation/report.md`.
