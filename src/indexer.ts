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

interface KnowledgeChunk {
  docPath: string;
  docTitle: string;
  docTags: string[];
  zapret2Version?: string;
  blockcheckwVersion?: string;
  sectionTitle: string;
  content: string;
  order: number;
}

type Intent = "TROUBLESHOOTING" | "REFERENCE" | "HOWTO" | null;

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

function splitIntoChunks(entry: KnowledgeEntry): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];
  const lines = entry.content.split("\n");

  let currentSection = "";
  let currentLines: string[] = [];
  let order = 0;

  const flush = () => {
    const content = currentLines.join("\n").trim();
    if (content) {
      chunks.push({
        docPath: entry.path,
        docTitle: entry.title,
        docTags: entry.tags,
        zapret2Version: entry.zapret2Version,
        blockcheckwVersion: entry.blockcheckwVersion,
        sectionTitle: currentSection,
        content,
        order: order++,
      });
    }
  };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      flush();
      currentSection = line.slice(3).trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  flush();

  if (chunks.length > 0) return chunks;

  return [{
    docPath: entry.path,
    docTitle: entry.title,
    docTags: entry.tags,
    zapret2Version: entry.zapret2Version,
    blockcheckwVersion: entry.blockcheckwVersion,
    sectionTitle: "",
    content: entry.content,
    order: 0,
  }];
}

export class KnowledgeIndex {
  private entries: KnowledgeEntry[] = [];
  private chunks: KnowledgeChunk[] = [];

  constructor(private knowledgeDir: string) {
    this.rebuild();
  }

  rebuild(): void {
    this.entries = [];
    this.chunks = [];
    const files = collectMarkdownFiles(this.knowledgeDir);

    for (const file of files) {
      const raw = readFileSync(file, "utf-8");
      const { meta, content } = parseFrontmatter(raw);

      const entry: KnowledgeEntry = {
        path: relative(this.knowledgeDir, file),
        title: meta.title ?? file,
        tags: (meta.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
        content: content.trim(),
        zapret2Version: meta["zapret2-version"],
        blockcheckwVersion: meta["blockcheckw-version"],
      };

      this.entries.push(entry);
      this.chunks.push(...splitIntoChunks(entry));
    }
  }

  /**
   * Keyword-based search with chunk-level retrieval, intent detection, and context narrowing.
   * @param context - what the agent already knows/checked (used to deprioritize already-covered topics)
   */
  query(topic: string, maxTokens?: number, context?: string): KnowledgeEntry[] {
    const keywords = this.tokenize(topic);
    if (keywords.length === 0) return this.entries;

    const intent = this.detectIntent(keywords);
    const contextKeywords = context ? this.tokenize(context) : [];

    const scoredChunks: { chunk: KnowledgeChunk; score: number }[] = [];

    for (const chunk of this.chunks) {
      let score = 0;

      for (const keyword of keywords) {
        const kw = keyword.toLowerCase();

        // Document title match (highest weight)
        if (chunk.docTitle.toLowerCase().includes(kw)) score += 10;

        // Section title match
        if (chunk.sectionTitle.toLowerCase().includes(kw)) score += 8;

        // Tag exact match
        if (chunk.docTags.some((t) => t.toLowerCase() === kw)) score += 8;

        // Tag partial match
        if (chunk.docTags.some((t) => t.toLowerCase().includes(kw))) score += 4;

        // Content match (count occurrences, capped)
        const contentLower = chunk.content.toLowerCase();
        let idx = 0;
        let count = 0;
        while ((idx = contentLower.indexOf(kw, idx)) !== -1) {
          count++;
          idx += kw.length;
        }
        score += Math.min(count, 5) * 2;
      }

      // Intent boost
      score += this.intentBoost(chunk.docPath, intent);

      // Context narrowing: deprioritize chunks that cover already-known topics
      if (contextKeywords.length > 0) {
        score += this.contextAdjust(chunk, contextKeywords);
      }

      if (score > 0) {
        scoredChunks.push({ chunk, score });
      }
    }

    scoredChunks.sort((a, b) => b.score - a.score);

    return this.assembleResults(scoredChunks, maxTokens);
  }

  /** Get all entries (for listing) */
  all(): KnowledgeEntry[] {
    return this.entries;
  }

  private assembleResults(
    scoredChunks: { chunk: KnowledgeChunk; score: number }[],
    maxTokens?: number,
  ): KnowledgeEntry[] {
    const docOrder: string[] = [];
    const docChunks = new Map<string, KnowledgeChunk[]>();

    for (const { chunk } of scoredChunks) {
      const existing = docChunks.get(chunk.docPath);
      if (existing) {
        if (!existing.some((c) => c.order === chunk.order)) {
          existing.push(chunk);
        }
      } else {
        docOrder.push(chunk.docPath);
        docChunks.set(chunk.docPath, [chunk]);
      }
    }

    const charLimit = maxTokens ? maxTokens * 4 : undefined;
    let totalChars = 0;
    const result: KnowledgeEntry[] = [];

    for (const path of docOrder) {
      const chunks = docChunks.get(path)!;
      const parent = this.entries.find((e) => e.path === path)!;

      const assembledContent = chunks
        .sort((a, b) => a.order - b.order)
        .map((c) => c.sectionTitle ? `## ${c.sectionTitle}\n\n${c.content}` : c.content)
        .join("\n\n");

      const entry: KnowledgeEntry = {
        path: parent.path,
        title: parent.title,
        tags: parent.tags,
        content: assembledContent,
        zapret2Version: parent.zapret2Version,
        blockcheckwVersion: parent.blockcheckwVersion,
      };

      const entryChars = entry.title.length + entry.content.length + 50;
      if (charLimit && totalChars + entryChars > charLimit && result.length > 0) break;
      result.push(entry);
      totalChars += entryChars;
    }

    return result;
  }

  private detectIntent(keywords: string[]): Intent {
    const INTENTS: Record<Exclude<Intent, null>, string[]> = {
      TROUBLESHOOTING: [
        "error", "failed", "problem", "работает", "тормозит",
        "ошибка", "broken", "timeout", "открывается", "fix", "issue",
        "debug", "диагностика", "troubleshoot", "troubleshooting",
        "конфликт", "conflict",
      ],
      REFERENCE: [
        "параметры", "options", "reference", "syntax", "список", "опции",
        "cli", "параметр", "флаг", "flag", "blobs", "blob",
      ],
      HOWTO: [
        "как", "setup", "install", "настроить", "configure", "установка",
        "подключить", "установить", "how", "guide", "workflow", "миграция",
        "migration",
      ],
    };

    let bestIntent: Intent = null;
    let bestCount = 0;

    for (const [intent, triggers] of Object.entries(INTENTS)) {
      const count = keywords.filter((kw) =>
        triggers.some((t) => t === kw || kw.includes(t))
      ).length;
      if (count > bestCount) {
        bestCount = count;
        bestIntent = intent as Intent;
      }
    }

    return bestIntent;
  }

  /**
   * Adjust score based on context (what agent already knows).
   * Chunks heavily overlapping with context get deprioritized.
   * Chunks that add NEW information relative to context get boosted.
   */
  private contextAdjust(chunk: KnowledgeChunk, contextKeywords: string[]): number {
    const chunkText = (chunk.sectionTitle + " " + chunk.content).toLowerCase();
    let overlapCount = 0;

    for (const ckw of contextKeywords) {
      if (chunkText.includes(ckw)) {
        overlapCount++;
      }
    }

    const overlapRatio = contextKeywords.length > 0 ? overlapCount / contextKeywords.length : 0;

    // High overlap (>60% of context keywords found in chunk) → deprioritize
    if (overlapRatio > 0.6) return -8;
    // Medium overlap (30-60%) → slight penalty
    if (overlapRatio > 0.3) return -3;
    // Low overlap (<30%) → this chunk has new info, slight boost
    return 2;
  }

  private intentBoost(docPath: string, intent: Intent): number {
    if (!intent) return 0;

    const PATH_INTENT_MAP: Record<string, Exclude<Intent, null>> = {
      "troubleshooting/": "TROUBLESHOOTING",
      "config/": "REFERENCE",
      "workflows/": "HOWTO",
    };

    for (const [prefix, matchIntent] of Object.entries(PATH_INTENT_MAP)) {
      if (docPath.startsWith(prefix) && intent === matchIntent) {
        return 5;
      }
    }

    return 0;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2);
  }
}
