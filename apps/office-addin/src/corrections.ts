import type { Issue } from "./contracts";

export function codePointOffsetToCodeUnitIndex(text: string, offset: number): number {
  if (!Number.isInteger(offset) || offset < 0) return -1;
  const points = Array.from(text);
  if (offset > points.length) return -1;
  return points.slice(0, offset).join("").length;
}

export function applyIssueToText(snapshot: string, issue: Issue, replacement: string): string {
  const start = codePointOffsetToCodeUnitIndex(snapshot, issue.offset_start);
  const end = codePointOffsetToCodeUnitIndex(snapshot, issue.offset_end);
  if (start < 0 || end < start || snapshot.slice(start, end) !== issue.original) {
    throw new Error("Die voorstel stem nie met die geselekteerde teks ooreen nie. Kontroleer weer.");
  }
  return `${snapshot.slice(0, start)}${replacement}${snapshot.slice(end)}`;
}

export function occurrenceCount(text: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let cursor = 0;
  while ((cursor = text.indexOf(needle, cursor)) >= 0) {
    count += 1;
    cursor += Math.max(needle.length, 1);
  }
  return count;
}

