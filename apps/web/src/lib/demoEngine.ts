import type {
  CheckRequest,
  CheckResponse,
  Issue,
  IssueType,
  RewriteMode,
  RewriteResponse,
  Severity,
  Suggestion,
  WordLookupResponse,
} from "../types";
import { applySafeIssues } from "./text";

interface DemoRule {
  pattern: RegExp;
  replacement: string | ((match: string) => string);
  type: IssueType;
  severity: Severity;
  message: string;
  ruleId: string;
  confidence: number;
}

const rules: DemoRule[] = [
  {
    pattern: /\bvol\s+tooi\b/giu,
    replacement: "voltooi",
    type: "spelling",
    severity: "error",
    message: "Hierdie werkwoord word as een woord geskryf.",
    ruleId: "AF_COMPOUND_VOLTOOI",
    confidence: 0.98,
  },
  {
    pattern: /\bhoeveelheid\s+opmeter\b/giu,
    replacement: "hoeveelheidsopmeter",
    type: "terminology",
    severity: "error",
    message: "Die beroepstitel is ’n samestelling en kry ’n verbindings-s.",
    ruleId: "AF_TERM_HOEVEELHEIDSOPMETER",
    confidence: 0.98,
  },
  {
    pattern: /\bkoste\s+beraming\b/giu,
    replacement: "kosteberaming",
    type: "terminology",
    severity: "warning",
    message: "Afrikaanse samestellings word gewoonlik vas geskryf.",
    ruleId: "AF_COMPOUND_KOSTEBERAMING",
    confidence: 0.96,
  },
  {
    pattern: /\bgister\s+winkel\s+toe\b/giu,
    replacement: "gister na die winkel toe",
    type: "grammar",
    severity: "warning",
    message: "Gebruik ‘na die winkel toe’ om die bestemming natuurlik uit te druk.",
    ruleId: "AF_GRAMMAR_DESTINATION",
    confidence: 0.91,
  },
  {
    pattern: /\basb\.?\b/giu,
    replacement: "asseblief",
    type: "style",
    severity: "warning",
    message: "Skryf die afkorting uit in algemene of formele dokumente.",
    ruleId: "AF_STYLE_ASB",
    confidence: 0.93,
  },
  {
    pattern: /([!?])\1+/gu,
    replacement: (match) => match[0],
    type: "punctuation",
    severity: "warning",
    message: "Een leesteken is gewoonlik genoeg.",
    ruleId: "AF_PUNCT_REPEATED",
    confidence: 0.99,
  },
  {
    pattern: /\s+([,.;:!?])/gu,
    replacement: (match) => match.trimStart(),
    type: "punctuation",
    severity: "error",
    message: "Verwyder die spasie voor die leesteken.",
    ruleId: "AF_PUNCT_SPACE_BEFORE",
    confidence: 0.99,
  },
];

function stableId(ruleId: string, start: number, original: string): string {
  let hash = 2166136261;
  for (const char of `${ruleId}:${start}:${original}`) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return `${ruleId.toLowerCase()}-${(hash >>> 0).toString(36)}`;
}

function suggestion(text: string, confidence: number): Suggestion {
  return { text, confidence, source: "rule" };
}

function issueFromRule(match: RegExpExecArray, rule: DemoRule): Issue {
  const original = match[0];
  const replacement = typeof rule.replacement === "function" ? rule.replacement(original) : rule.replacement;
  return {
    id: stableId(rule.ruleId, match.index, original),
    type: rule.type,
    severity: rule.severity,
    message_af: rule.message,
    message_en: null,
    offset_start: match.index,
    offset_end: match.index + original.length,
    original,
    suggestions: [suggestion(replacement, rule.confidence)],
    rule_id: rule.ruleId,
    confidence: rule.confidence,
  };
}

export function checkTextLocally(request: CheckRequest): CheckResponse {
  const started = performance.now();
  const issues: Issue[] = [];
  const disabled = new Set(request.disabled_rules ?? []);
  const ignoredWords = new Set((request.ignore_words ?? []).map((word) => word.toLocaleLowerCase("af-ZA")));

  for (const rule of rules) {
    if (disabled.has(rule.ruleId)) continue;
    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
    for (const match of request.text.matchAll(pattern)) {
      if (ignoredWords.has(match[0].toLocaleLowerCase("af-ZA"))) continue;
      issues.push(issueFromRule(match, rule));
    }
  }

  const duplicatedWords = /\b([\p{L}][\p{L}’'-]*)\s+\1\b/giu;
  if (!disabled.has("AF_GRAMMAR_DUPLICATE_WORD")) {
    for (const match of request.text.matchAll(duplicatedWords)) {
      const original = match[0];
      const word = match[1];
      issues.push({
        id: stableId("AF_GRAMMAR_DUPLICATE_WORD", match.index, original),
        type: "grammar",
        severity: "error",
        message_af: `“${word}” kom twee keer direk na mekaar voor.`,
        message_en: null,
        offset_start: match.index,
        offset_end: match.index + original.length,
        original,
        suggestions: [suggestion(word, 0.99)],
        rule_id: "AF_GRAMMAR_DUPLICATE_WORD",
        confidence: 0.99,
      });
    }
  }

  const filtered = issues
    .sort((a, b) => a.offset_start - b.offset_start || b.confidence - a.confidence)
    .filter((candidate, index, all) =>
      !all.slice(0, index).some(
        (accepted) => candidate.offset_start < accepted.offset_end && candidate.offset_end > accepted.offset_start,
      ),
    );

  return {
    text: request.text,
    privacy_mode: request.privacy_mode,
    issues: filtered,
    issue_count: filtered.length,
    processing_time_ms: Math.max(1, Math.round(performance.now() - started)),
    language: "af",
    source: "browser-demo",
  };
}

const replacements: Partial<Record<RewriteMode, Array<[RegExp, string]>>> = {
  clearer: [
    [/\bten einde\b/giu, "om"],
    [/\bmet betrekking tot\b/giu, "oor"],
    [/\bas gevolg van die feit dat\b/giu, "omdat"],
  ],
  concise: [
    [/\bop hierdie stadium\b/giu, "nou"],
    [/\bin die nabye toekoms\b/giu, "binnekort"],
    [/\b'n groot hoeveelheid\b/giu, "baie"],
  ],
  formal: [
    [/\bjy\b/giu, "u"],
    [/\bjulle\b/giu, "u"],
    [/\bokay\b/giu, "goed"],
  ],
  academic: [
    [/\bwys\b/giu, "toon"],
    [/\bkyk na\b/giu, "ondersoek"],
    [/\bbaie belangrik\b/giu, "wesenlik"],
  ],
  "plain-language": [
    [/\bimplementeer\b/giu, "voer in"],
    [/\bfasiliteer\b/giu, "maak moontlik"],
    [/\bfinaliseer\b/giu, "handel af"],
  ],
  informal: [
    [/\basseblief\b/giu, "asb."],
    [/\bu\b/gu, "jy"],
  ],
};

export function rewriteTextLocally(text: string, mode: RewriteMode): RewriteResponse {
  if (mode === "translate-en-af" || mode === "translate-af-en") {
    throw new Error("Vertaling is slegs beskikbaar wanneer ’n toepaslike taalmodel gekonfigureer is.");
  }

  const checked = checkTextLocally({ text, privacy_mode: "local", document_mode: "general" });
  let revised = applySafeIssues(text, checked.issues).text;
  const changes: string[] = [];
  if (revised !== text) changes.push("Veilige spelling-, samestelling- en leestekenverbeterings toegepas.");

  for (const [pattern, replacement] of replacements[mode] ?? []) {
    const next = revised.replace(pattern, replacement);
    if (next !== revised) {
      changes.push(`Duideliker woordkeuse: ${replacement}.`);
      revised = next;
    }
  }

  if (mode === "professional-email") {
    revised = `Goeiedag\n\n${revised.trim()}\n\nVriendelike groete`;
    changes.push("’n Neutrale professionele e-posstruktuur bygevoeg.");
  } else if (mode === "friendly" && revised.trim() && !/^Hallo/iu.test(revised)) {
    revised = `Hallo!\n\n${revised.trim()}`;
    changes.push("’n Vriendelike, toeganklike opening bygevoeg.");
  }

  if (changes.length === 0) changes.push("Geen veilige deterministiese verandering was nodig nie.");
  return {
    original_text: text,
    rewritten_text: revised,
    mode,
    applied_changes: changes,
    changes: changes.map((explanation) => ({
      kind: "deterministic",
      original: text,
      replacement: revised,
      explanation_af: explanation,
      source: "rule" as const,
    })),
    provider: "browser-demo",
    ai_used: false,
    source: "browser-demo",
  };
}

const wordGuidance: Record<string, Partial<WordLookupResponse>> = {
  mooi: {
    found: true,
    spelling_status: "correct",
    part_of_speech: "byvoeglike naamwoord",
    synonyms: ["pragtig", "aanskoulik", "netjies"],
    antonyms: ["lelik", "onaanskoulik"],
    formal_alternatives: ["aanskoulik", "uitmuntend"],
    informal_alternatives: ["puik", "lekker"],
    examples: ["Die tuin lyk mooi in die lente."],
    generated_guidance: "Taalriglyn: beskryf iets wat aangenaam lyk of ’n positiewe indruk maak.",
  },
  vinnig: {
    found: true,
    spelling_status: "correct",
    synonyms: ["gou", "spoedig", "snel"],
    antonyms: ["stadig", "langsaam"],
    formal_alternatives: ["spoedig"],
    informal_alternatives: ["gou"],
    examples: ["Ons sal die navraag vinnig hanteer."],
  },
  hoeveelheidsopmeter: {
    found: true,
    spelling_status: "correct",
    synonyms: ["bourekenaar"],
    compounds: ["hoeveelheidsopmetingsdiens"],
    related_terms: ["kosteberaming", "hoeveelheidslys", "eenheidskoers"],
    examples: ["Die hoeveelheidsopmeter het die kosteberaming hersien."],
    source_attribution: "Skryfwys se oorspronklike konstruksieterminologielys",
  },
};

export function lookupWordLocally(word: string): WordLookupResponse {
  const key = word.trim().toLocaleLowerCase("af-ZA");
  const guidance = wordGuidance[key] ?? {};
  return {
    word: word.trim(),
    found: guidance.found ?? false,
    spelling_status: guidance.spelling_status ?? "unknown",
    part_of_speech: guidance.part_of_speech ?? null,
    meaning: null,
    meaning_source: null,
    suggestions: guidance.suggestions ?? [],
    synonyms: guidance.synonyms ?? [],
    antonyms: guidance.antonyms ?? [],
    formal_alternatives: guidance.formal_alternatives ?? [],
    informal_alternatives: guidance.informal_alternatives ?? [],
    examples: guidance.examples ?? [],
    compounds: guidance.compounds ?? [],
    related_terms: guidance.related_terms ?? [],
    source_attribution: guidance.source_attribution ?? null,
    generated_guidance: guidance.generated_guidance ?? null,
  };
}
