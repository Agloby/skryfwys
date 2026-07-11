import { afterEach, describe, expect, it, vi } from "vitest";
import { listCustomTerms, lookupWord } from "./api";

afterEach(() => vi.restoreAllMocks());

describe("API response normalization", () => {
  it("normalizes structured lookup suggestions and source-aware guidance", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      word: "mooi",
      normalized: "mooi",
      spelling_status: "correct",
      suggestions: [{ text: "mooi", confidence: 1, source: "dictionary" }],
      part_of_speech: "byvoeglike naamwoord",
      meaning: null,
      meaning_source: null,
      guidance: { text: "Projekgeskrewe taalriglyn.", label: "project-authored-language-guidance", source: "Skryfwys seed lexicon" },
      synonyms: ["pragtig"],
      antonyms: [],
      formal_alternatives: [],
      informal_alternatives: [],
      examples: [],
      compounds: [],
      related_terms: [],
      sources: ["Skryfwys seed lexicon"],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = await lookupWord("mooi");
    expect(result.suggestions).toEqual(["mooi"]);
    expect(result.generated_guidance).toBe("Projekgeskrewe taalriglyn.");
    expect(result.source_attribution).toBe("Skryfwys seed lexicon");
  });

  it("reads the API's items/count custom-term envelope", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      items: [{ id: 1, term: "Skryfwys", preferred: true, case_sensitive: true, category: "naam", alternatives: [], source: "user", locale: "af-ZA", user_id: "guest", created_at: "2026-07-11T00:00:00Z" }],
      count: 1,
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    expect((await listCustomTerms())[0].term).toBe("Skryfwys");
  });
});
