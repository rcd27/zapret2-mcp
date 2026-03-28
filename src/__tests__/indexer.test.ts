import { describe, it, expect } from "vitest";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { KnowledgeIndex } from "../indexer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const knowledgeDir = resolve(__dirname, "..", "..", "knowledge");

describe("KnowledgeIndex", () => {
  const index = new KnowledgeIndex(knowledgeDir);

  it("indexes all knowledge files", () => {
    const entries = index.all();
    expect(entries.length).toBeGreaterThanOrEqual(10);
  });

  it("each entry has title, content, and path", () => {
    for (const entry of index.all()) {
      expect(entry.title).toBeTruthy();
      expect(entry.content).toBeTruthy();
      expect(entry.path).toBeTruthy();
    }
  });

  it("each entry has at least one tag", () => {
    for (const entry of index.all()) {
      expect(entry.tags.length).toBeGreaterThan(0);
    }
  });

  it("finds split2 strategies", () => {
    const results = index.query("split2");
    expect(results.length).toBeGreaterThan(0);
    const titles = results.map((r) => r.title);
    expect(titles.some((t) => t.toLowerCase().includes("segmentation") || t.toLowerCase().includes("tcp"))).toBe(true);
  });

  it("finds blockcheckw documentation", () => {
    const results = index.query("blockcheckw scan");
    expect(results.length).toBeGreaterThan(0);
    const content = results.map((r) => r.content).join(" ");
    expect(content).toContain("blockcheckw");
  });

  it("finds troubleshooting info", () => {
    const results = index.query("troubleshooting dns");
    expect(results.length).toBeGreaterThan(0);
  });

  it("finds config reference", () => {
    const results = index.query("nfqws2 options");
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns empty array for nonsense query", () => {
    const results = index.query("xyzzy foobar baz");
    expect(results.length).toBe(0);
  });

  it("respects token limit", () => {
    const unlimited = index.query("strategy");
    const limited = index.query("strategy", 500);
    expect(limited.length).toBeLessThanOrEqual(unlimited.length);
    expect(limited.length).toBeGreaterThan(0);
  });

  it("ranks title matches higher than content matches", () => {
    const results = index.query("fake packets");
    expect(results.length).toBeGreaterThan(0);
    // The entry with "Fake Packet" in title should be first
    expect(results[0].title.toLowerCase()).toContain("fake");
  });

  it("has version info in entries", () => {
    const withVersion = index.all().filter((e) => e.zapret2Version || e.blockcheckwVersion);
    expect(withVersion.length).toBeGreaterThan(0);
  });

  // --- P0: chunk-level retrieval ---

  it("returns chunks, not full documents", () => {
    const fullDoc = index.all().find((e) => e.path.includes("common-issues"));
    const results = index.query("DNS не резолвится", 2000);
    const matched = results.find((r) => r.path.includes("common-issues"));
    if (fullDoc && matched) {
      expect(matched.content.length).toBeLessThan(fullDoc.content.length);
    }
  });

  it("default token limit caps response size", () => {
    // Without explicit tokens, query uses no limit internally,
    // but index.ts applies 4000 default. Here we test the mechanism.
    const unlimited = index.query("strategy");
    const limited = index.query("strategy", 4000);
    const unlimitedChars = unlimited.reduce((sum, e) => sum + e.content.length, 0);
    const limitedChars = limited.reduce((sum, e) => sum + e.content.length, 0);
    expect(limitedChars).toBeLessThanOrEqual(unlimitedChars);
  });

  // --- P0: intent detection ---

  it("boosts troubleshooting docs for error-like queries", () => {
    const results = index.query("ошибка nfqws2 не работает");
    expect(results.length).toBeGreaterThan(0);
    // Troubleshooting doc should appear before config reference
    const troubleshootIdx = results.findIndex((r) => r.path.startsWith("troubleshooting/"));
    const configIdx = results.findIndex((r) => r.path.startsWith("config/"));
    if (troubleshootIdx >= 0 && configIdx >= 0) {
      expect(troubleshootIdx).toBeLessThan(configIdx);
    }
  });

  it("boosts config docs for reference-like queries", () => {
    const results = index.query("параметры nfqws2 options syntax");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].path.startsWith("config/")).toBe(true);
  });

  it("boosts workflow docs for howto queries", () => {
    const results = index.query("как установить zapret2 setup install");
    expect(results.length).toBeGreaterThan(0);
    const workflowIdx = results.findIndex((r) => r.path.startsWith("workflows/"));
    expect(workflowIdx).toBeGreaterThanOrEqual(0);
    expect(workflowIdx).toBeLessThanOrEqual(2); // in top 3
  });

  it("section title match boosts relevant chunks", () => {
    const results = index.query("circular стратегия автоперебор");
    expect(results.length).toBeGreaterThan(0);
    const content = results[0].content.toLowerCase();
    expect(content).toContain("circular");
  });

  // --- P1: context narrowing ---

  it("context deprioritizes already-covered topics", () => {
    const withoutContext = index.query("youtube не работает");
    const withContext = index.query("youtube не работает", undefined, "QUIC отключён, curl на роутере OK");
    // With context mentioning QUIC, QUIC-related docs should rank lower
    const quicRankWithout = withoutContext.findIndex((r) => r.path.includes("quic"));
    const quicRankWith = withContext.findIndex((r) => r.path.includes("quic"));
    if (quicRankWithout >= 0 && quicRankWith >= 0) {
      expect(quicRankWith).toBeGreaterThanOrEqual(quicRankWithout);
    }
  });

  it("context does not break results when empty", () => {
    const withoutContext = index.query("strategy");
    const withEmptyContext = index.query("strategy", undefined, "");
    expect(withEmptyContext.length).toBe(withoutContext.length);
  });

  it("groups multiple chunks from same document", () => {
    const results = index.query("fake multisplit strategy");
    for (const r of results) {
      // Each result should appear only once (no duplicate paths)
      const count = results.filter((x) => x.path === r.path).length;
      expect(count).toBe(1);
    }
  });
});
