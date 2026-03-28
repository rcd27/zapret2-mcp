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
});
