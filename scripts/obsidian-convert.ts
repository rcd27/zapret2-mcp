/**
 * Obsidian Markdown → standard Markdown converter for zapret2-mcp knowledge base.
 *
 * Handles:
 * - [[wikilinks]] → plain text
 * - ![[embeds]] → removal or reference text
 * - Obsidian frontmatter → zapret2-mcp frontmatter
 * - Obsidian callouts → blockquotes
 */

export interface ConvertOptions {
  /** Original file path in the Obsidian vault (e.g. "Zapret/Zapret2 - blob.md") */
  sourcePath: string;
  /** Override title (otherwise extracted from H1 or filename) */
  title?: string;
  /** Tags to use in frontmatter */
  tags?: string[];
  /** zapret2 version */
  zapret2Version?: string;
}

interface ObsidianFrontmatter {
  tags?: string | string[];
  aliases?: string[];
  [key: string]: unknown;
}

/**
 * Strip Obsidian frontmatter and return body + parsed meta.
 */
export function stripFrontmatter(raw: string): { meta: ObsidianFrontmatter; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const meta: ObsidianFrontmatter = {};
  const lines = match[1].split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const idx = line.indexOf(":");
    if (idx <= 0) continue;

    const key = line.slice(0, idx).trim();
    const rawValue = line.slice(idx + 1).trim();

    // Handle YAML arrays (indented lines starting with -)
    if (!rawValue || rawValue === "") {
      const arrayValues: string[] = [];
      while (i + 1 < lines.length && lines[i + 1].match(/^\s+-\s/)) {
        i++;
        arrayValues.push(lines[i].replace(/^\s+-\s*/, "").trim());
      }
      if (arrayValues.length > 0) {
        meta[key] = arrayValues;
      }
    } else {
      meta[key] = rawValue;
    }
  }

  return { meta, body: match[2] };
}

/**
 * Convert [[wikilinks]] to plain text.
 * [[Page Name]] → "Page Name"
 * [[Page Name|Display Text]] → "Display Text"
 * [[Page#Section]] → "Page: Section"
 * [[Page#Section|Display]] → "Display"
 */
export function convertWikiLinks(content: string): string {
  return content.replace(/\[\[([^\]]+)\]\]/g, (_match, inner: string) => {
    // Has display text?
    const pipeIdx = inner.indexOf("|");
    if (pipeIdx !== -1) {
      return inner.slice(pipeIdx + 1);
    }
    // Has section reference?
    const hashIdx = inner.indexOf("#");
    if (hashIdx !== -1) {
      const page = inner.slice(0, hashIdx);
      const section = inner.slice(hashIdx + 1);
      return page ? `${page}: ${section}` : section;
    }
    return inner;
  });
}

/**
 * Remove image embeds: ![[image.png]], ![[image.png|size]]
 */
export function removeImageEmbeds(content: string): string {
  return content.replace(/!\[\[([^\]]+\.(png|jpg|jpeg|gif|svg|webp|bmp)(\|[^\]]*)?)\]\]/gi, "");
}

/**
 * Convert note embeds to reference text.
 * ![[NoteName]] → "(см. NoteName)"
 * ![[NoteName#Section]] → "(см. NoteName: Section)"
 */
export function convertNoteEmbeds(content: string): string {
  return content.replace(/!\[\[([^\]]+)\]\]/g, (_match, inner: string) => {
    const pipeIdx = inner.indexOf("|");
    const display = pipeIdx !== -1 ? inner.slice(pipeIdx + 1) : inner;
    const hashIdx = display.indexOf("#");
    if (hashIdx !== -1) {
      const page = display.slice(0, hashIdx);
      const section = display.slice(hashIdx + 1);
      return `(см. ${page}: ${section})`;
    }
    return `(см. ${display})`;
  });
}

/**
 * Convert Obsidian callouts to blockquotes.
 * > [!note] Title  →  > **Note:** Title
 */
export function convertCallouts(content: string): string {
  return content.replace(
    /^(>\s*)\[!(\w+)\]\s*(.*)/gm,
    (_match, prefix: string, type: string, title: string) => {
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      return title ? `${prefix}**${label}:** ${title}` : `${prefix}**${label}**`;
    },
  );
}

/**
 * Remove lines that are only Obsidian-specific (empty aliases, img fields, etc.)
 */
export function cleanupContent(content: string): string {
  return content
    // Remove excessive blank lines (3+ → 2)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract title from content: first H1 heading, or derive from filename.
 */
export function extractTitle(body: string, sourcePath: string): string {
  const h1Match = body.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].trim();

  // Derive from filename
  const filename = sourcePath.split("/").pop()?.replace(/\.md$/, "") ?? sourcePath;
  return filename.replace(/[-_]/g, " ");
}

/**
 * Generate zapret2-mcp compliant frontmatter.
 */
export function generateFrontmatter(opts: {
  title: string;
  tags: string[];
  zapret2Version?: string;
  date: string;
}): string {
  const lines = [
    "---",
    `title: ${opts.title}`,
  ];
  if (opts.zapret2Version) {
    lines.push(`zapret2-version: ${opts.zapret2Version}`);
  }
  lines.push(`tags: ${opts.tags.join(", ")}`);
  lines.push(`created: ${opts.date}`);
  lines.push(`updated: ${opts.date}`);
  lines.push(`source: community`);
  lines.push("---");
  return lines.join("\n");
}

/**
 * Full conversion pipeline: Obsidian markdown → zapret2-mcp knowledge article.
 */
export function convertObsidianMarkdown(raw: string, options: ConvertOptions): string {
  const { body } = stripFrontmatter(raw);

  const today = new Date().toISOString().slice(0, 10);
  const title = options.title ?? extractTitle(body, options.sourcePath);
  const tags = options.tags ?? [];

  const frontmatter = generateFrontmatter({
    title,
    tags,
    zapret2Version: options.zapret2Version,
    date: today,
  });

  let content = body;
  content = removeImageEmbeds(content);
  content = convertNoteEmbeds(content);
  content = convertWikiLinks(content);
  content = convertCallouts(content);
  content = cleanupContent(content);

  return `${frontmatter}\n\n${content}\n`;
}
