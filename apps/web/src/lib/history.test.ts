import { describe, expect, it } from "vitest";
import { historyReducer, type HistoryState } from "./history";

const initial: HistoryState = { past: [], present: "een", future: [] };

describe("historyReducer", () => {
  it("supports undo and redo without losing the current value", () => {
    const changed = historyReducer(initial, { type: "set", value: "twee" });
    const undone = historyReducer(changed, { type: "undo" });
    expect(undone).toEqual({ past: [], present: "een", future: ["twee"] });
    expect(historyReducer(undone, { type: "redo" }).present).toBe("twee");
  });

  it("clears redo history after a new edit", () => {
    const state = { past: [], present: "een", future: ["twee"] };
    expect(historyReducer(state, { type: "set", value: "drie" }).future).toEqual([]);
  });
});
