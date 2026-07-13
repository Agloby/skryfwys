# Afrikaans Hunspell dictionary source record

This directory contains the replaceable Afrikaans Hunspell dictionary files used
by Skryfwys as a broader spelling allow-list.

## Source

- Upstream: LibreOffice `dictionaries` repository, `af_ZA`
- Repository: <https://github.com/LibreOffice/dictionaries/tree/master/af_ZA>
- Pinned commit: `da8a7e73fd26a134ad7c6438fa7c310730906b3a`
- Files:
  - `af_ZA.dic`
  - `af_ZA.aff`
  - `README_af_ZA.txt`

## Licence

The upstream README and affix file identify the dictionary as LGPL:

- Licence: GNU Lesser General Public License, version 2.1 or later
- Licence text included here as `COPYING.LESSER-2.1.txt`
- Primary attribution: Translate.org.za project and credited original authors in
  `README_af_ZA.txt`

## Skryfwys use

Skryfwys loads `af_ZA.dic` at runtime as a replaceable data file. The current
adapter uses base forms from the Hunspell dictionary to reduce false spelling
alerts for valid Afrikaans words. Full affix expansion is intentionally left as a
future adapter improvement.

Do not compile these files into an opaque binary or source-code blob. A user must
be able to inspect and replace the `.dic` and `.aff` files with a compatible
modified version.
