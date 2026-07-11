import { applyIssueToText, occurrenceCount } from "./corrections";
import type { Issue } from "./contracts";

export interface HostAdapter {
  readonly hostName: "Word" | "Outlook";
  getSelectedText(): Promise<string>;
  applyIssue(snapshot: string, issue: Issue, replacement: string): Promise<void>;
}

export function createHostAdapter(host: Office.HostType): HostAdapter {
  if (host === Office.HostType.Word) return new WordHostAdapter();
  if (host === Office.HostType.Outlook) return new OutlookHostAdapter();
  throw new Error("Hierdie Office-gasheer word nog nie ondersteun nie.");
}

class WordHostAdapter implements HostAdapter {
  readonly hostName = "Word" as const;

  async getSelectedText(): Promise<string> {
    return Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.load("text");
      await context.sync();
      return selection.text;
    });
  }

  async applyIssue(snapshot: string, issue: Issue, replacement: string): Promise<void> {
    const revised = applyIssueToText(snapshot, issue, replacement);
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.load("text");
      await context.sync();
      if (selection.text !== snapshot) throw new Error("Die Word-keuse het verander. Kontroleer dit weer.");

      if (occurrenceCount(snapshot, issue.original) === 1) {
        const matches = selection.search(issue.original, { matchCase: true, matchWholeWord: false });
        matches.load("items");
        await context.sync();
        if (matches.items.length === 1) {
          matches.items[0]!.insertText(replacement, Word.InsertLocation.replace);
          await context.sync();
          return;
        }
      }

      // Office.js has no stable arbitrary-character-range API for a selected Word range.
      // Replacing the verified selection is the safe fallback for repeated issue text.
      selection.insertText(revised, Word.InsertLocation.replace);
      await context.sync();
    });
  }
}

interface OutlookSelectedDataResult {
  data: string;
}

interface OutlookSelectionItem {
  getSelectedDataAsync(
    coercionType: Office.CoercionType,
    callback: (result: Office.AsyncResult<OutlookSelectedDataResult>) => void
  ): void;
  setSelectedDataAsync(
    data: string,
    options: { coercionType: Office.CoercionType },
    callback: (result: Office.AsyncResult<void>) => void
  ): void;
}

function outlookItem(): OutlookSelectionItem {
  const item = Office.context.mailbox?.item as unknown as Partial<OutlookSelectionItem> | undefined;
  if (!item || typeof item.getSelectedDataAsync !== "function" || typeof item.setSelectedDataAsync !== "function") {
    throw new Error("Outlook laat nie tekskeuses in hierdie itemmodus toe nie. Gebruik 'n boodskap wat jy opstel.");
  }
  return item as OutlookSelectionItem;
}

class OutlookHostAdapter implements HostAdapter {
  readonly hostName = "Outlook" as const;

  async getSelectedText(): Promise<string> {
    return new Promise((resolve, reject) => {
      outlookItem().getSelectedDataAsync(Office.CoercionType.Text, (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) resolve(result.value.data || "");
        else reject(new Error(result.error.message));
      });
    });
  }

  async applyIssue(snapshot: string, issue: Issue, replacement: string): Promise<void> {
    const current = await this.getSelectedText();
    if (current !== snapshot) throw new Error("Die Outlook-keuse het verander. Kontroleer dit weer.");
    const revised = applyIssueToText(snapshot, issue, replacement);
    await new Promise<void>((resolve, reject) => {
      outlookItem().setSelectedDataAsync(revised, { coercionType: Office.CoercionType.Text }, (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) resolve();
        else reject(new Error(result.error.message));
      });
    });
  }
}

