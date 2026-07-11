import { describe, expect, it } from "vitest";
import type { Issue } from "../types";
import { applyIssue, applySafeIssues, buildWordDiff, getReadingStats, resolveIssueRange } from "./text";

function issue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: "issue-safe-001",
    type: "spelling",
    severity: "error",
    message_af: "Toetsvoorstel",
    message_en: null,
    offset_start: 0,
    offset_end: 4,
    original: "fout",
    suggestions: [{ text: "reg", confidence: 0.98, source: "dictionary" }],
    rule_id: "AF_TEST_001",
    confidence: 0.98,
    ...overrides,
  };
}

describe("Unicode-safe issue application", () => {
  it("converts code-point offsets when an emoji appears before an issue", () => {
    const text = "😀 Die vol tooi.";
    const unicodeIssue = issue({
      offset_start: 6,
      offset_end: 14,
      original: "vol tooi",
      suggestions: [{ text: "voltooi", confidence: 0.99, source: "rule" }],
    });

    expect(resolveIssueRange(text, unicodeIssue)).toEqual({ start: 7, end: 15 });
    expect(applyIssue(text, unicodeIssue, unicodeIssue.suggestions[0])).toBe("😀 Die voltooi.");
  });

  it("rejects a stale issue rather than applying it to a later duplicate", () => {
    const staleIssue = issue({ offset_start: 0, offset_end: 4, original: "fout" });
    const changedText = "reg en fout";

    expect(resolveIssueRange(changedText, staleIssue)).toBeNull();
    expect(applyIssue(changedText, staleIssue, staleIssue.suggestions[0])).toBeNull();
  });

  it("applies non-overlapping safe issues from right to left", () => {
    const text = "fout en sleg";
    const second = issue({
      id: "issue-safe-002",
      offset_start: 8,
      offset_end: 12,
      original: "sleg",
      suggestions: [{ text: "goed", confidence: 0.95, source: "rule" }],
    });
    expect(applySafeIssues(text, [issue(), second])).toEqual({
      text: "reg en goed",
      applied: ["issue-safe-002", "issue-safe-001"],
    });
  });
});

describe("text utilities", () => {
  it("calculates Afrikaans reading statistics without counting punctuation as words", () => {
    const stats = getReadingStats("Goeiedag! Dit is ’n kort sin.");
    expect(stats.words).toBe(6);
    expect(stats.sentences).toBe(2);
    expect(stats.characters).toBe([..."Goeiedag! Dit is ’n kort sin."].length);
  });

  it("builds a readable inline word diff", () => {
    const parts = buildWordDiff("Die koste beraming.", "Die kosteberaming.");
    expect(parts.some((part) => part.kind === "removed" && part.text.includes("koste"))).toBe(true);
    expect(parts.some((part) => part.kind === "added" && part.text.includes("kosteberaming"))).toBe(true);
  });
});
