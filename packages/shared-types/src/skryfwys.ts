export type IssueType =
  | "spelling"
  | "grammar"
  | "punctuation"
  | "style"
  | "terminology"
  | "clarity";

export type Severity = "info" | "warning" | "error";

export interface Suggestion {
  text: string;
  confidence: number;
  source: "dictionary" | "rule" | "language-model" | "custom-term";
}

export interface Issue {
  id: string;
  type: IssueType;
  severity: Severity;
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
  privacy_mode: "local" | "private-server" | "cloud-ai";
  issues: Issue[];
  issue_count: number;
}

export interface RewriteResponse {
  original_text: string;
  rewritten_text: string;
  mode: string;
  applied_changes: string[];
}

