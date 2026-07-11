import { describe, expect, it } from "vitest";
import type { Issue } from "../src/contracts";
import { applyIssueToText, codePointOffsetToCodeUnitIndex, occurrenceCount } from "../src/corrections";

function issue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: "test", type: "spelling", severity: "error", message_af: "Toets",
    offset_start: 4, offset_end: 7, original: "ver", suggestions: [], rule_id: "TEST", confidence: 1,
    ...overrides
  };
}

describe("Office correction helpers", () => {
  it("applies only the API-provided code-point range", () => {
    expect(applyIssueToText("Die verkeerde", issue(), "reg")) .toBe("Die regkeerde");
  });

  it("handles astral Unicode before an issue", () => {
    const text = "😀 môree";
    expect(codePointOffsetToCodeUnitIndex(text, 2)).toBe(3);
    expect(applyIssueToText(text, issue({ offset_start: 2, offset_end: 7, original: "môree" }), "môre")).toBe("😀 môre");
  });

  it("rejects stale or mismatched issue ranges", () => {
    expect(() => applyIssueToText("Die korrekte", issue(), "reg")).toThrow(/stem nie/);
  });

  it("counts repeated text for Word range-safety decisions", () => {
    expect(occurrenceCount("nie nou nie", "nie")).toBe(2);
    expect(occurrenceCount("teks", "")).toBe(0);
  });
});
