# zapret2-mcp

[![CI](https://github.com/rcd27/zapret2-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/rcd27/zapret2-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/zapret2-mcp)](https://www.npmjs.com/package/zapret2-mcp)
[![Knowledge Base](https://img.shields.io/badge/knowledge_base-27_articles-green)](./knowledge/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

База знаний по [zapret2](https://github.com/bol-van/zapret2) (DPI bypass) и [blockcheckw](https://github.com/rcd27/blockcheckw) (сканер стратегий). Работает как [MCP-сервер](https://modelcontextprotocol.io/) для LLM-агентов и как обычная документация.

> **Можно использовать без агентов.** [`knowledge/`](./knowledge/) — 27 статей на русском языке. Открывайте и читайте как обычную документацию, без установки чего-либо.

## Что внутри

| Раздел | Статей | Темы |
|--------|--------|------|
| [strategies/](./knowledge/strategies/) | 8 | TCP segmentation, fake packets, multidisorder, QUIC, circular, Discord, Telegram, orchestration |
| [config/](./knowledge/config/) | 5 | nfqws2 CLI, zapret2 config, UCI, blobs, миграция v1 → v2 |
| [troubleshooting/](./knowledge/troubleshooting/) | 5 | Smart TV + YouTube, QUIC, IPv6, FLOWOFFLOAD, конфликты с Podkop |
| [tspu/](./knowledge/tspu/) | 4 | Архитектура ТСПУ, DPI engine, методы блокировки, двухстадийная система |
| [workflows/](./knowledge/workflows/) | 2 | Установка, поиск стратегии |
| [blockcheckw/](./knowledge/blockcheckw/) | 2 | Overview, команды |
| [platforms/](./knowledge/platforms/) | 1 | Поддерживаемые платформы |

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

- [zapret2](https://github.com/bol-van/zapret2) — DPI bypass от bol-van
- [blockcheckw](https://github.com/rcd27/blockcheckw) — быстрый сканер стратегий
- [tspu-docs](https://github.com/DanielLavrushin/tspu-docs) — документация ТСПУ
- Community — обезличенные знания из открытых обсуждений

## Лицензия

MIT
