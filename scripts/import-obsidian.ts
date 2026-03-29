#!/usr/bin/env npx tsx
/**
 * Import curated articles from Obsidian Publish (Zapret GUI documentation)
 * into the zapret2-mcp knowledge base.
 *
 * Usage:
 *   npx tsx scripts/import-obsidian.ts [--dry-run]
 *
 * The script fetches articles from the Obsidian Publish API, converts
 * Obsidian-flavored markdown to standard markdown, generates proper
 * frontmatter, and writes to knowledge/obsidian-gui/.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { convertObsidianMarkdown, type ConvertOptions } from "./obsidian-convert.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const OUTPUT_DIR = resolve(PROJECT_ROOT, "knowledge", "obsidian-gui");

const VAULT_ID = "18b1b883e5b94cb062854c94fb182bb4";
const ACCESS_URL = `https://publish-01.obsidian.md/access/${VAULT_ID}`;

// Delay between requests to be nice to Obsidian's servers
const REQUEST_DELAY_MS = 300;

/**
 * Curated list of articles to import with metadata overrides.
 * Only HIGH VALUE articles that add NEW knowledge not in our base.
 */
const IMPORT_LIST: Array<{
  /** Path in the Obsidian vault */
  path: string;
  /** Output filename (without .md) */
  outputName: string;
  /** Title override */
  title: string;
  /** Tags for the knowledge base */
  tags: string[];
}> = [
  {
    path: "Zapret/Zapret2 - lua-desync.md",
    outputName: "lua-desync-reference",
    title: "lua-desync — полный справочник функций",
    tags: ["lua-desync", "функции", "fake", "multisplit", "multidisorder", "syndata", "tcpseg", "reference"],
  },
  {
    path: "Zapret/Zapret2 - payload.md",
    outputName: "payload-types",
    title: "Типы payload в zapret2",
    tags: ["payload", "фильтрация", "tls_client_hello", "http_req", "quic_initial", "mtproto", "discord", "stun", "wireguard"],
  },
  {
    path: "Zapret/Zapret2 - out-range.md",
    outputName: "out-range-in-range",
    title: "out-range / in-range — диапазоны обработки пакетов",
    tags: ["out-range", "in-range", "диапазон", "пакеты", "conntrack", "data-packet"],
  },
  {
    path: "Zapret/Zapret2 - blob.md",
    outputName: "blobs-detailed",
    title: "Блобы (blobs) — бинарные данные для fake-пакетов",
    tags: ["blob", "fake", "tls_mod", "fake_default_tls", "fake_default_http", "fake_default_quic", "бинарные данные"],
  },
  {
    path: "Zapret/Zapret2 - wf.md",
    outputName: "windivert-filters",
    title: "WinDivert фильтры (--wf-*) для Windows",
    tags: ["windivert", "windows", "wf", "фильтры", "winws2", "порты"],
  },
  {
    path: "Zapret/Zapret2 - последовательность аргументов.md",
    outputName: "argument-ordering",
    title: "Последовательность аргументов в zapret2",
    tags: ["аргументы", "порядок", "payload", "lua-desync", "hostlist", "профиль", "filter"],
  },
  {
    path: "Zapret/Zapret2 - mtproto.md",
    outputName: "mtproto-detection",
    title: "MTProto — обнаружение и обход блокировки Telegram",
    tags: ["mtproto", "telegram", "detection", "filter-l7", "ipset", "шифрование"],
  },
  {
    path: "Zapret/Zapret2 - основные флаги.md",
    outputName: "main-flags",
    title: "Основные флаги запуска nfqws2/winws2",
    tags: ["флаги", "nfqws2", "winws2", "параметры", "запуск", "qnum", "daemon", "pidfile"],
  },
  // Оркестратор пропущен — страница состоит из Obsidian embed'ов, контент пустой.
  // У нас уже есть knowledge/strategies/orchestration.md с полным покрытием.
];

async function fetchArticle(path: string): Promise<string | null> {
  const url = `${ACCESS_URL}/${encodeURIComponent(path).replace(/%2F/g, "/")}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`  FAIL ${response.status}: ${path}`);
      return null;
    }
    return await response.text();
  } catch (error) {
    console.error(`  ERROR fetching ${path}:`, error);
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  console.log(`zapret2-mcp Obsidian import${dryRun ? " (DRY RUN)" : ""}`);
  console.log(`Source: publish.obsidian.md/zapret`);
  console.log(`Output: knowledge/obsidian-gui/`);
  console.log(`Articles to import: ${IMPORT_LIST.length}`);
  console.log("---");

  if (!dryRun) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of IMPORT_LIST) {
    const outputPath = resolve(OUTPUT_DIR, `${item.outputName}.md`);

    console.log(`Fetching: ${item.path}`);
    const raw = await fetchArticle(item.path);

    if (!raw) {
      failed++;
      continue;
    }

    const options: ConvertOptions = {
      sourcePath: item.path,
      title: item.title,
      tags: item.tags,
      zapret2Version: "v0.9.4.5",
    };

    const converted = convertObsidianMarkdown(raw, options);

    // Check if file exists and content is the same
    if (existsSync(outputPath)) {
      const existing = readFileSync(outputPath, "utf-8");
      // Compare content after frontmatter (skip date changes)
      const existingBody = existing.split("---\n").slice(2).join("---\n");
      const newBody = converted.split("---\n").slice(2).join("---\n");
      if (existingBody === newBody) {
        console.log(`  SKIP (unchanged): ${item.outputName}.md`);
        skipped++;
        continue;
      }
    }

    if (dryRun) {
      console.log(`  WOULD WRITE: ${item.outputName}.md (${converted.length} chars)`);
    } else {
      writeFileSync(outputPath, converted, "utf-8");
      console.log(`  WROTE: ${item.outputName}.md (${converted.length} chars)`);
    }
    imported++;

    await sleep(REQUEST_DELAY_MS);
  }

  console.log("---");
  console.log(`Done! Imported: ${imported}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
