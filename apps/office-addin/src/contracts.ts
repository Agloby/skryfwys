export type PrivacyMode = "local" | "private-server" | "cloud-ai";
export type DocumentMode = "general" | "formal" | "informal" | "academic" | "professional";

export interface Suggestion {
  text: string;
  confidence: number;
  source: "dictionary" | "rule" | "language-model" | "custom-term";
}

export interface Issue {
  id: string;
  type: "spelling" | "grammar" | "punctuation" | "style" | "terminology" | "clarity";
  severity: "info" | "warning" | "error";
  message_af: string;
  message_en?: string | null;
  offset_start: number;
  offset_end: number;
  original: string;
  suggestions: Suggestion[];
  rule_id: string;
  confidence: number;
}

export interface CheckResponse {
  text: string;
  privacy_mode: PrivacyMode;
  issues: Issue[];
  issue_count: number;
  processing_time_ms?: number;
  language?: string;
}

