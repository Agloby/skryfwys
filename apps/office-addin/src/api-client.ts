import type { CheckResponse, DocumentMode, PrivacyMode } from "./contracts";

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_INPUT_CODE_POINTS = 50_000;

export class SkryfwysApiClient {
  constructor(private readonly baseUrl = "") {}

  async check(text: string, privacyMode: PrivacyMode, documentMode: DocumentMode): Promise<CheckResponse> {
    if (!text.trim()) throw new Error("Kies eers teks in die dokument.");
    if (Array.from(text).length > MAX_INPUT_CODE_POINTS) {
      throw new Error(`Die keuse is langer as ${MAX_INPUT_CODE_POINTS.toLocaleString("af-ZA")} karakters.`);
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/api/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ text, privacy_mode: privacyMode, document_mode: documentMode }),
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        signal: controller.signal
      });
      if (!response.ok) {
        const problem: unknown = await response.json().catch(() => null);
        const detail = typeof problem === "object" && problem && "detail" in problem && typeof problem.detail === "string"
          ? `: ${problem.detail}`
          : "";
        throw new Error(`Die Skryfwys API het HTTP ${response.status} teruggestuur${detail}`);
      }
      const payload: unknown = await response.json();
      if (!isCheckResponse(payload)) throw new Error("Die API-antwoord het nie die verwagte formaat nie.");
      return payload;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw new Error("Die kontrole het te lank geneem.");
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }
}

function isCheckResponse(value: unknown): value is CheckResponse {
  if (typeof value !== "object" || value === null || !("issues" in value) || !Array.isArray(value.issues)) return false;
  return value.issues.every((issue) => typeof issue === "object" && issue !== null
    && "offset_start" in issue && Number.isInteger(issue.offset_start)
    && "offset_end" in issue && Number.isInteger(issue.offset_end)
    && "suggestions" in issue && Array.isArray(issue.suggestions));
}

