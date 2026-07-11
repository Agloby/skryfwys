# Evaluation data

`suite.json` contains compact, project-authored inputs that expand to at least
100 accepted cases, 100 spelling cases, 100 grammar/punctuation cases, 50
compound cases, 50 code-switching cases, 50 formal/informal cases, and 25
construction or quantity-surveying cases. `seed_cases.json` records the intended
outcome of every example supplied in the product brief.

Run:

```powershell
python -m services.language_engine.evaluation
```

The command validates category counts, unique generated text, exact offsets,
and crashes. It writes `report.json` and `report.md` here. The templates and
sentences are original project material licensed under the repository licence;
no HAT or WAT examples are included.

