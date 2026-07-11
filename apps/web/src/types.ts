export type IssueType =
  | "spelling"
  | "grammar"
  | "punctuation"
  | "style"
  | "terminology"
  | "clarity";

export type Severity = "info" | "warning" | "error";
export type PrivacyMode = "local" | "private-server" | "cloud-ai";
export type DocumentMode = "general" | "formal" | "informal" | "academic" | "professional";
export type UiLanguage = "af" | "en";

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

export interface CheckRequest {
  text: string;
  privacy_mode: PrivacyMode;
  document_mode: DocumentMode;
  disabled_rules?: string[];
  ignore_words?: string[];
  user_id?: string;
}

export interface CheckResponse {
  text: string;
  privacy_mode: PrivacyMode;
  issues: Issue[];
  issue_count: number;
  processing_time_ms?: number;
  language?: string;
  source?: "api" | "browser-demo";
}

export type RewriteMode =
  | "correct-only"
  | "clearer"
  | "concise"
  | "formal"
  | "friendly"
  | "professional-email"
  | "academic"
  | "plain-language"
  | "informal"
  | "preserve-wording"
  | "translate-en-af"
  | "translate-af-en";

export interface RewriteChange {
  kind: string;
  original: string;
  replacement: string;
  explanation_af: string;
  source: Suggestion["source"];
}

export interface RewriteResponse {
  original_text: string;
  rewritten_text: string;
  mode: RewriteMode | string;
  applied_changes: string[];
  changes?: RewriteChange[];
  provider?: string | null;
  ai_used?: boolean;
  source?: "api" | "browser-demo";
}

export interface WordLookupResponse {
  word: string;
  found: boolean;
  spelling_status?: "correct" | "unknown" | "incorrect";
  part_of_speech?: string | null;
  meaning?: string | null;
  meaning_source?: string | null;
  suggestions: string[];
  synonyms: string[];
  antonyms: string[];
  formal_alternatives: string[];
  informal_alternatives: string[];
  examples: string[];
  compounds: string[];
  related_terms: string[];
  source_attribution?: string | null;
  generated_guidance?: string | null;
}

export interface CustomTerm {
  id?: number | string;
  term: string;
  preferred: boolean;
  case_sensitive: boolean;
  category: string;
  alternatives: string[];
  definition?: string;
  notes?: string;
  source: string;
  locale: string;
  user_id?: string;
  created_at?: string;
}

export interface AppSettings {
  uiLanguage: UiLanguage;
  privacyMode: PrivacyMode;
  documentMode: DocumentMode;
  saveHistory: boolean;
  autoCheck: boolean;
  enabledCategories: IssueType[];
}

export type ViewId =
  | "editor"
  | "rewrite"
  | "word-helper"
  | "dictionary"
  | "terminology"
  | "settings"
  | "privacy"
  | "sources"
  | "about"
  | "diagnostics";

export interface ApiHealth {
  status: "online" | "offline" | "checking";
  version?: string;
  engine?: string;
  apiPath?: string;
  checkedAt?: string;
  detail?: string;
}
