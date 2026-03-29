# zapret2-mcp

[![CI](https://github.com/rcd27/zapret2-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/rcd27/zapret2-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/zapret2-mcp)](https://www.npmjs.com/package/zapret2-mcp)
[![downloads](https://img.shields.io/npm/dm/zapret2-mcp)](https://www.npmjs.com/package/zapret2-mcp)
[![Knowledge Base](https://img.shields.io/badge/knowledge_base-45_articles-green)](./knowledge/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

База знаний по [zapret2](https://github.com/bol-van/zapret2) (DPI bypass) и [blockcheckw](https://github.com/rcd27/blockcheckw) (сканер стратегий). Работает как [MCP-сервер](https://modelcontextprotocol.io/) для LLM-агентов и как обычная документация.

> **Можно использовать без агентов.** [`knowledge/`](./knowledge/) — 45 статей на русском языке. Открывайте и читайте как обычную документацию, без установки чего-либо.

## Что внутри

| Раздел | Статей | Темы |
|--------|--------|------|
| [strategies/](./knowledge/strategies/) | 10 | TCP segmentation, fake packets, Lua scripting, QUIC, circular, Discord, Telegram, orchestration, community production strategies |
| [config/](./knowledge/config/) | 9 | nfqws2 CLI, zapret2 config, desync profiles, hostlists/ipsets, auto-hostlist, security hardening, UCI, blobs, миграция v1 → v2 |
| [troubleshooting/](./knowledge/troubleshooting/) | 6 | Smart TV + YouTube, YouTube видео не грузится (googlevideo CDN), QUIC, IPv6, FLOWOFFLOAD, конфликты с Podkop |
| [tspu/](./knowledge/tspu/) | 6 | Архитектура ТСПУ, DPI engine, методы блокировки, двухстадийная система, ночные реконфигурации, юридические риски |
| [workflows/](./knowledge/workflows/) | 2 | Установка, поиск стратегии |
| [blockcheckw/](./knowledge/blockcheckw/) | 2 | Overview, команды |
| [platforms/](./knowledge/platforms/) | 2 | Linux, OpenWrt, Windows, FreeBSD, OpenBSD, Android, десктопный Linux + nftables |
| [obsidian-gui/](./knowledge/obsidian-gui/) | 8 | lua-desync справочник, payload типы, out-range/in-range, блобы, WinDivert фильтры, порядок аргументов, MTProto, основные флаги |

## Подключение к LLM-агенту

Сервер **не выполняет команды** — он отдаёт знания. Агент читает и действует сам.

### Claude Code / Claude Desktop

```json
{
  "mcpServers": {
    "zapret2": {
      "command": "npx",
      "args": ["-y", "zapret2-mcp"]
    }
  }
}
```

### Cursor

Settings → MCP Servers → Add:

```json
{
  "zapret2": {
    "command": "npx",
    "args": ["-y", "zapret2-mcp"]
  }
}
```

### Из исходников

```bash
git clone --recurse-submodules https://github.com/rcd27/zapret2-mcp.git
cd zapret2-mcp
npm install && npm run build
npm start
```

## MCP API

### Tool

| Tool | Описание |
|------|----------|
| `query-zapret-knowledge(topic, tokens?)` | Keyword-поиск по базе знаний с ранжированием |

### Resources

| URI | Описание |
|-----|----------|
| `zapret2://knowledge/{path}` | Прямой доступ к статьям базы знаний по пути (listResources для списка всех) |

### Prompts

| Prompt | Описание |
|--------|----------|
| `setup-zapret` | Пошаговая установка zapret2 |
| `find-bypass-strategy` | Поиск стратегии через blockcheckw |
| `troubleshoot` | Диагностика проблем |
| `strategy-knowledge` | Справочник стратегий DPI bypass |

## Примеры вопросов

```
"YouTube тормозит на Samsung TV — что делать?"
"Как настроить голос Discord через zapret2?"
"blockcheck нашёл стратегию, но сайт не открывается"
"Как перевести стратегию с zapret v1 на zapret2?"
"Что такое circular и как настроить автоперебор?"
"QUIC — отключать или обрабатывать?"
```

## Источники

- [deepwiki/zapret2](https://deepwiki.com/bol-van/zapret2) — AI-сгенерированная документация из исходного кода (приоритетный источник)
- [zapret2](https://github.com/bol-van/zapret2) — DPI bypass от bol-van
- [blockcheckw](https://github.com/rcd27/blockcheckw) — быстрый сканер стратегий
- [tspu-docs](https://github.com/DanielLavrushin/tspu-docs) — документация ТСПУ
- Academic: [IMC 2022](https://dl.acm.org/doi/10.1145/3517745.3561461), [IMC 2021](https://dl.acm.org/doi/10.1145/3487552.3487858), [NDSS 2020](https://www.ndss-symposium.org/ndss-paper/decentralized-control-a-case-study-of-russia/), [USENIX Security 2023](https://www.usenix.org/conference/usenixsecurity23/presentation/ramesh-network-responses) — рецензированные исследования архитектуры и поведения ТСПУ
- [Zapret GUI Docs](https://publish.obsidian.md/zapret) — документация сообщества (импорт через `npm run import:obsidian`)
- Community — обезличенные знания из открытых обсуждений

## Лицензия

MIT
