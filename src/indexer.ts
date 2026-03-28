import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

export interface KnowledgeEntry {
  /** Relative path from knowledge root */
  path: string;
  /** Title from frontmatter */
  title: string;
  /** Tags from frontmatter */
  tags: string[];
  /** Full markdown content (without frontmatter) */
  content: string;
  /** zapret2 version from frontmatter */
  zapret2Version?: string;
  /** blockcheckw version from frontmatter */
  blockcheckwVersion?: string;
}

interface ScoredEntry {
  entry: KnowledgeEntry;
  score: number;
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; content: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, content: raw };

  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }
  return { meta, content: match[2] };
}

function collectMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectMarkdownFiles(full));
    } else if (entry.endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

export class KnowledgeIndex {
  private entries: KnowledgeEntry[] = [];

  constructor(private knowledgeDir: string) {
    this.rebuild();
  }

  rebuild(): void {
    this.entries = [];
    const files = collectMarkdownFiles(this.knowledgeDir);

    for (const file of files) {
      const raw = readFileSync(file, "utf-8");
      const { meta, content } = parseFrontmatter(raw);

      this.entries.push({
        path: relative(this.knowledgeDir, file),
        title: meta.title ?? file,
        tags: (meta.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
        content: content.trim(),
        zapret2Version: meta["zapret2-version"],
        blockcheckwVersion: meta["blockcheckw-version"],
      });
    }
  }

  /** Keyword-based search. Returns entries ranked by relevance. */
  query(topic: string, maxTokens?: number): KnowledgeEntry[] {
    const keywords = this.tokenize(topic);
    if (keywords.length === 0) return this.entries;

    const scored: ScoredEntry[] = [];

    for (const entry of this.entries) {
      let score = 0;

      for (const keyword of keywords) {
        const kw = keyword.toLowerCase();

        // Title match (highest weight)
        if (entry.title.toLowerCase().includes(kw)) score += 10;

        // Tag exact match (high weight)
        if (entry.tags.some((t) => t.toLowerCase() === kw)) score += 8;

        // Tag partial match
        if (entry.tags.some((t) => t.toLowerCase().includes(kw))) score += 4;

        // Content match (count occurrences, capped)
        const contentLower = entry.content.toLowerCase();
        let idx = 0;
        let count = 0;
        while ((idx = contentLower.indexOf(kw, idx)) !== -1) {
          count++;
          idx += kw.length;
        }
        score += Math.min(count, 5) * 2;
      }

      if (score > 0) {
        scored.push({ entry, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    if (!maxTokens) return scored.map((s) => s.entry);

    // Approximate token limit (1 token ≈ 4 chars)
    const charLimit = maxTokens * 4;
    let totalChars = 0;
    const result: KnowledgeEntry[] = [];

    for (const { entry } of scored) {
      const entryChars = entry.title.length + entry.content.length + 50;
      if (totalChars + entryChars > charLimit && result.length > 0) break;
      result.push(entry);
      totalChars += entryChars;
    }

    return result;
  }

  /** Get all entries (for listing) */
  all(): KnowledgeEntry[] {
    return this.entries;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2);
  }
}
