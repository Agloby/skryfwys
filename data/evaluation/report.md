# Skryfwys Evaluation Report

Generated: 2026-07-11T14:32:29.544060+00:00

This report measures the original, deterministic seed suite. It is not a claim of Grammarly-level accuracy.

## Dataset

- Generated cases: 475
- Explicit seed cases: 13
- Unique generated texts: 475
- accepted: 100
- code-switching: 50
- compound: 50
- construction: 25
- formal-informal: 50
- grammar-punctuation: 100
- spelling: 100

## Metrics

- overall issue precision: 1.0
- overall label recall: 1.0
- spelling precision: 1.0
- spelling recall: 1.0
- suggestion top 1 accuracy: 1.0
- suggestion top 3 accuracy: 1.0
- grammar precision: 1.0
- grammar recall: 1.0
- false positives per 1000 words: 0.0
- average response time ms: 0.164
- p95 response time ms: 0.192
- maximum response time ms: 2.473
- ai cost per 1000 words: 0.0

## Quality gates

- PASS — category minimums met
- PASS — zero crashes
- PASS — offsets verified
- PASS — normal response under 500 ms
- PASS — no raw text in report failures
- PASS — no invented dictionary definitions
- PASS — all labelled rules detected

## Limitations

- The suite uses project-authored templates and a deliberately small seed lexicon.
- Metrics measure this labelled suite and do not establish broad real-world accuracy.
- AI cost is zero because evaluation runs deterministic local checks only.
