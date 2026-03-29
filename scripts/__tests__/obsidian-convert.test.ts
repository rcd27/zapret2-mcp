import { describe, it, expect } from "vitest";
import {
  stripFrontmatter,
  convertWikiLinks,
  removeImageEmbeds,
  convertNoteEmbeds,
  convertCallouts,
  extractTitle,
  generateFrontmatter,
  convertObsidianMarkdown,
} from "../obsidian-convert.js";

describe("stripFrontmatter", () => {
  it("strips Obsidian frontmatter and returns body", () => {
    const raw = `---\ntags:\naliases:\n  - blob\nimg:\n---\n# Content here`;
    const { meta, body } = stripFrontmatter(raw);
    expect(body).toBe("# Content here");
    expect(meta.aliases).toEqual(["blob"]);
  });

  it("handles missing frontmatter", () => {
    const raw = "# No frontmatter";
    const { meta, body } = stripFrontmatter(raw);
    expect(body).toBe("# No frontmatter");
    expect(meta).toEqual({});
  });

  it("parses simple key-value pairs", () => {
    const raw = `---\ntags: zapret\nlink: http://example.com\n---\nBody`;
    const { meta } = stripFrontmatter(raw);
    expect(meta.tags).toBe("zapret");
    expect(meta.link).toBe("http://example.com");
  });
});

describe("convertWikiLinks", () => {
  it("converts simple wikilinks to plain text", () => {
    expect(convertWikiLinks("See [[Zapret2]]")).toBe("See Zapret2");
  });

  it("converts wikilinks with display text", () => {
    expect(convertWikiLinks("See [[home|Zapret 2]]")).toBe("See Zapret 2");
  });

  it("converts wikilinks with section references", () => {
    expect(convertWikiLinks("See [[Page#Section]]")).toBe("See Page: Section");
  });

  it("converts section-only references", () => {
    expect(convertWikiLinks("See [[#Section]]")).toBe("See Section");
  });

  it("handles multiple wikilinks in one line", () => {
    expect(convertWikiLinks("[[A]] and [[B|Display]]")).toBe("A and Display");
  });
});

describe("removeImageEmbeds", () => {
  it("removes PNG embeds", () => {
    expect(removeImageEmbeds("![[image.png]]")).toBe("");
  });

  it("removes embeds with size", () => {
    expect(removeImageEmbeds("![[photo.jpg|500]]")).toBe("");
  });

  it("preserves non-image embeds", () => {
    expect(removeImageEmbeds("![[NoteName]]")).toBe("![[NoteName]]");
  });
});

describe("convertNoteEmbeds", () => {
  it("converts note embeds to reference text", () => {
    expect(convertNoteEmbeds("![[manual]]")).toBe("(см. manual)");
  });

  it("converts note embeds with sections", () => {
    expect(convertNoteEmbeds("![[hosts|Ошибки GEO]]")).toBe("(см. Ошибки GEO)");
  });
});

describe("convertCallouts", () => {
  it("converts callouts to bold labels", () => {
    expect(convertCallouts("> [!note] Important info")).toBe("> **Note:** Important info");
  });

  it("converts callouts without title", () => {
    expect(convertCallouts("> [!warning]")).toBe("> **Warning**");
  });
});

describe("extractTitle", () => {
  it("extracts title from H1", () => {
    expect(extractTitle("# My Title\n\nContent", "file.md")).toBe("My Title");
  });

  it("derives title from filename when no H1", () => {
    expect(extractTitle("No heading here", "Zapret/my-file.md")).toBe("my file");
  });
});

describe("generateFrontmatter", () => {
  it("generates valid frontmatter", () => {
    const fm = generateFrontmatter({
      title: "Test Article",
      tags: ["tag1", "tag2"],
      zapret2Version: "v0.9.4.5",
      date: "2026-03-29",
    });
    expect(fm).toContain("title: Test Article");
    expect(fm).toContain("tags: tag1, tag2");
    expect(fm).toContain("zapret2-version: v0.9.4.5");
    expect(fm).toContain("source: community");
    expect(fm).toContain("created: 2026-03-29");
    expect(fm).toContain("updated: 2026-03-29");
  });

  it("omits zapret2-version when not provided", () => {
    const fm = generateFrontmatter({
      title: "Test",
      tags: ["tag"],
      date: "2026-03-29",
    });
    expect(fm).not.toContain("zapret2-version");
  });
});

describe("convertObsidianMarkdown", () => {
  it("full pipeline: strips frontmatter, converts links, generates new frontmatter", () => {
    const raw = `---\ntags:\naliases:\n  - blob\nimg:\n---\n# Блобы в [[Zapret2]]\n\n![[image.png]]\n\nSee [[fake|fake пакеты]] for details.`;
    const result = convertObsidianMarkdown(raw, {
      sourcePath: "Zapret/blob.md",
      title: "Блобы в zapret2",
      tags: ["blob", "fake"],
    });

    expect(result).toContain("title: Блобы в zapret2");
    expect(result).toContain("tags: blob, fake");
    expect(result).toContain("source: community");
    expect(result).not.toContain("[[");
    expect(result).not.toContain("![[image.png]]");
    expect(result).toContain("fake пакеты");
  });

  it("never includes usernames in output", () => {
    const raw = `---\ntags:\n---\n# Title\n\nBy [[UserName]] check [[home|Zapret 2]]`;
    const result = convertObsidianMarkdown(raw, {
      sourcePath: "test.md",
      tags: ["test"],
    });
    expect(result).not.toContain("[[");
    expect(result).toContain("source: community");
  });
});
