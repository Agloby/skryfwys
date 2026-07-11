import type { Issue, Suggestion } from "../types";

export const MAX_TEXT_LENGTH = 20_000;

export interface ReadingStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  minutes: number;
  lix: number;
  level: "Maklik" | "Gemiddeld" | "Moeilik";
}

export function getReadingStats(text: string): ReadingStats {
  const words = text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];
  const sentenceMatches = text.match(/[.!?]+(?=\s|$)/g);
  const sentences = Math.max(text.trim() ? 1 : 0, sentenceMatches?.length ?? 0);
  const paragraphs = text.trim() ? text.trim().split(/\n\s*\n/).length : 0;
  const longWords = words.filter((word) => [...word].length > 6).length;
  const lix = words.length
    ? Math.round(words.length / Math.max(sentences, 1) + (longWords * 100) / words.length)
    : 0;
  const level = lix < 35 ? "Maklik" : lix < 50 ? "Gemiddeld" : "Moeilik";

  return {
    words: words.length,
    characters: [...text].length,
    charactersNoSpaces: [...text.replace(/\s/gu, "")].length,
    sentences,
    paragraphs,
    minutes: words.length ? Math.max(1, Math.ceil(words.length / 200)) : 0,
    lix,
    level,
  };
}

export function isSafeSuggestion(issue: Issue): boolean {
  const first = issue.suggestions[0];
  return Boolean(
    first &&
      issue.severity !== "info" &&
      issue.confidence >= 0.82 &&
      first.confidence >= 0.82 &&
      first.source !== "language-model",
  );
}

export interface ResolvedRange {
  start: number;
  end: number;
}

/** Resolve API Unicode code-point offsets to JavaScript UTF-16 indices when needed. */
export function resolveIssueRange(text: string, issue: Issue): ResolvedRange | null {
  const direct = text.slice(issue.offset_start, issue.offset_end);
  if (direct === issue.original) return { start: issue.offset_start, end: issue.offset_end };

  const codePoints = [...text];
  const start = codePoints.slice(0, issue.offset_start).join("").length;
  const end = codePoints.slice(0, issue.offset_end).join("").length;
  if (text.slice(start, end) === issue.original) return { start, end };

  return null;
}

export function applyIssue(text: string, issue: Issue, suggestion: Suggestion): string | null {
  const range = resolveIssueRange(text, issue);
  if (!range) return null;
  const { start, end } = range;
  return `${text.slice(0, start)}${suggestion.text}${text.slice(end)}`;
}

export function applySafeIssues(text: string, issues: Issue[]): { text: string; applied: string[] } {
  const candidates = issues
    .filter(isSafeSuggestion)
    .filter((issue) => issue.suggestions.length > 0)
    .map((issue) => ({ issue, range: resolveIssueRange(text, issue) }))
    .filter((item): item is { issue: Issue; range: ResolvedRange } => item.range !== null)
    .sort((a, b) => b.range.start - a.range.start || b.range.end - a.range.end);

  let next = text;
  const applied: string[] = [];
  let previousStart = Number.POSITIVE_INFINITY;

  for (const { issue, range } of candidates) {
    if (range.end > previousStart) continue;
    const suggestion = issue.suggestions[0];
    if (next.slice(range.start, range.end) !== issue.original) continue;
    next = `${next.slice(0, range.start)}${suggestion.text}${next.slice(range.end)}`;
    previousStart = range.start;
    applied.push(issue.id);
  }

  return { text: next, applied };
}

export type DiffKind = "same" | "added" | "removed";
export interface DiffPart {
  kind: DiffKind;
  text: string;
}

function tokens(value: string): string[] {
  return value.match(/\s+|[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*|[^\s]/gu) ?? [];
}

function mergeDiff(parts: DiffPart[]): DiffPart[] {
  return parts.reduce<DiffPart[]>((merged, part) => {
    const last = merged.at(-1);
    if (last?.kind === part.kind) last.text += part.text;
    else merged.push({ ...part });
    return merged;
  }, []);
}

export function buildWordDiff(original: string, revised: string): DiffPart[] {
  if (original === revised) return [{ kind: "same", text: original }];

  const left = tokens(original);
  const right = tokens(revised);
  const maxMatrixTokens = 500;

  if (left.length > maxMatrixTokens || right.length > maxMatrixTokens) {
    let prefix = 0;
    while (prefix < left.length && prefix < right.length && left[prefix] === right[prefix]) prefix += 1;
    let suffix = 0;
    while (
      suffix < left.length - prefix &&
      suffix < right.length - prefix &&
      left[left.length - 1 - suffix] === right[right.length - 1 - suffix]
    ) {
      suffix += 1;
    }
    const coarseParts: DiffPart[] = [
      { kind: "same", text: left.slice(0, prefix).join("") },
      { kind: "removed", text: left.slice(prefix, left.length - suffix).join("") },
      { kind: "added", text: right.slice(prefix, right.length - suffix).join("") },
      { kind: "same", text: suffix ? left.slice(left.length - suffix).join("") : "" },
    ];
    return mergeDiff(coarseParts.filter((part) => part.text));
  }

  const matrix = Array.from({ length: left.length + 1 }, () => new Uint16Array(right.length + 1));
  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      matrix[i][j] = left[i] === right[j]
        ? matrix[i + 1][j + 1] + 1
        : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
    }
  }

  const result: DiffPart[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      result.push({ kind: "same", text: left[i] });
      i += 1;
      j += 1;
    } else if (matrix[i + 1][j] >= matrix[i][j + 1]) {
      result.push({ kind: "removed", text: left[i] });
      i += 1;
    } else {
      result.push({ kind: "added", text: right[j] });
      j += 1;
    }
  }
  while (i < left.length) result.push({ kind: "removed", text: left[i++] });
  while (j < right.length) result.push({ kind: "added", text: right[j++] });
  return mergeDiff(result);
}

export function downloadText(filename: string, content: string, type = "text/plain;charset=utf-8"): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function parseCsvTerms(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    if (char === '"' && quoted && content[i + 1] === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && content[i + 1] === "\n") i += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
