import type {
  ApiHealth,
  CheckRequest,
  CheckResponse,
  CustomTerm,
  RewriteMode,
  RewriteResponse,
  WordLookupResponse,
} from "./types";

const origin = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const configuredPrefix = import.meta.env.VITE_API_PREFIX?.replace(/\/$/, "");
const prefixes = configuredPrefix ? [configuredPrefix] : ["/api/v1", "/api"];

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: string | Array<{ msg?: string }> };
    if (typeof payload.detail === "string") return payload.detail;
    if (Array.isArray(payload.detail)) return payload.detail.map((item) => item.msg).filter(Boolean).join("; ");
  } catch {
    // A plain-text or empty error response is handled below.
  }
  return `Die diens het met status ${response.status} geantwoord.`;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<{ data: T; apiPath: string }> {
  let lastError: unknown;
  for (const prefix of prefixes) {
    const apiPath = `${prefix}${path}`;
    try {
      const response = await fetch(`${origin}${apiPath}`, {
        ...init,
        headers: {
          Accept: "application/json",
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
          ...init?.headers,
        },
      });
      if (response.status === 404 && prefix !== prefixes.at(-1)) continue;
      if (!response.ok) throw new ApiError(await parseError(response), response.status);
      return { data: (await response.json()) as T, apiPath };
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError) throw error;
      if (prefix === prefixes.at(-1)) break;
    }
  }
  throw new ApiError(lastError instanceof Error ? lastError.message : "Die API is nie bereikbaar nie.");
}

export async function checkText(request: CheckRequest): Promise<CheckResponse> {
  const { data } = await apiRequest<CheckResponse>("/check", {
    method: "POST",
    body: JSON.stringify(request),
  });
  if (!Array.isArray(data.issues)) throw new ApiError("Die kontroleantwoord is ongeldig.");
  return { ...data, source: "api" };
}

export async function rewriteText(
  text: string,
  mode: RewriteMode,
  privacyMode: CheckRequest["privacy_mode"],
): Promise<RewriteResponse> {
  const { data } = await apiRequest<RewriteResponse>("/rewrite", {
    method: "POST",
    body: JSON.stringify({
      text,
      mode,
      privacy_mode: privacyMode,
      user_id: "guest",
      preserve_quotes: true,
    }),
  });
  return { ...data, source: "api" };
}

export async function lookupWord(word: string): Promise<WordLookupResponse> {
  interface RawGuidance {
    text: string;
    label: string;
    source: string;
  }
  interface RawLookupResponse {
    word: string;
    normalized: string;
    spelling_status: string;
    suggestions: Array<{ text: string; confidence: number; source: "dictionary" | "rule" | "language-model" | "custom-term" }>;
    part_of_speech: string | null;
    meaning: string | null;
    meaning_source: string | null;
    guidance: RawGuidance | null;
    synonyms: string[];
    antonyms: string[];
    formal_alternatives: string[];
    informal_alternatives: string[];
    examples: string[];
    compounds: string[];
    related_terms: string[];
    sources: string[];
  }
  const { data } = await apiRequest<RawLookupResponse>("/lookup", {
    method: "POST",
    body: JSON.stringify({ word, user_id: "guest" }),
  });
  return {
    word: data.word ?? word,
    found: data.spelling_status === "correct",
    spelling_status: data.spelling_status === "correct" || data.spelling_status === "incorrect" ? data.spelling_status : "unknown",
    part_of_speech: data.part_of_speech ?? null,
    meaning: data.meaning ?? null,
    meaning_source: data.meaning_source ?? null,
    suggestions: (data.suggestions ?? []).map((suggestion) => suggestion.text),
    synonyms: data.synonyms ?? [],
    antonyms: data.antonyms ?? [],
    formal_alternatives: data.formal_alternatives ?? [],
    informal_alternatives: data.informal_alternatives ?? [],
    examples: data.examples ?? [],
    compounds: data.compounds ?? [],
    related_terms: data.related_terms ?? [],
    source_attribution: data.sources?.join("; ") || data.guidance?.source || null,
    generated_guidance: data.guidance?.text ?? null,
  };
}

export async function listCustomTerms(): Promise<CustomTerm[]> {
  const { data } = await apiRequest<CustomTerm[] | { items?: CustomTerm[]; terms?: CustomTerm[] }>("/custom-terms?user_id=guest");
  return Array.isArray(data) ? data : data.items ?? data.terms ?? [];
}

export async function addCustomTerm(term: CustomTerm): Promise<CustomTerm> {
  const { data } = await apiRequest<CustomTerm>("/custom-terms", {
    method: "POST",
    body: JSON.stringify({
      term: term.term,
      preferred: term.preferred,
      case_sensitive: term.case_sensitive,
      category: term.category,
      alternatives: term.alternatives,
      definition: term.definition,
      notes: term.notes,
      source: term.source,
      locale: term.locale,
      user_id: "guest",
    }),
  });
  return data;
}

export async function deleteCustomTerm(id: string | number): Promise<void> {
  await apiRequest<unknown>(`/custom-terms/${encodeURIComponent(String(id))}?user_id=guest`, {
    method: "DELETE",
  });
}

export async function getHealth(): Promise<ApiHealth> {
  const healthCandidates = [`${origin}/api/v1/health`, `${origin}/health`];
  for (const path of healthCandidates) {
    try {
      const response = await fetch(path, { headers: { Accept: "application/json" } });
      if (!response.ok) continue;
      const payload = (await response.json()) as Record<string, unknown>;
      return {
        status: "online",
        version: typeof payload.version === "string" ? payload.version : undefined,
        engine: typeof payload.engine === "string" ? payload.engine : undefined,
        apiPath: new URL(response.url, window.location.href).pathname,
        checkedAt: new Date().toISOString(),
      };
    } catch {
      // Try the root health endpoint before reporting an offline service.
    }
  }
  return {
    status: "offline",
    detail: "Die Skryfwys-API is nie bereikbaar nie; blaaierdemo-funksies bly beskikbaar.",
    checkedAt: new Date().toISOString(),
  };
}

export async function getDiagnostics(): Promise<Record<string, unknown> | null> {
  try {
    const { data } = await apiRequest<Record<string, unknown>>("/diagnostics");
    return data;
  } catch {
    return null;
  }
}
