# zapret2-mcp

Knowledge MCP-сервер для [zapret2](https://github.com/bol-van/zapret2) и [blockcheckw](https://github.com/rcd27/blockcheckw). Подключи к AI-агенту — он получит экспертные знания по обходу DPI-блокировок и сможет настроить всё сам.

## Зачем

AI-агент (Claude, Cursor, etc.) умеет выполнять команды в терминале. Но он **не знает** как работает zapret2, какие стратегии бывают, как их подбирать и что делать если не работает. Этот MCP-сервер даёт агенту эти знания.

**Сервер не выполняет команды** — он отдаёт документацию и экспертизу. Агент читает и действует сам.

## Что внутри

**14 статей** в базе знаний:

- Стратегии DPI bypass: split2, disorder2, fake, fooling, QUIC, оркестрация
- Справочник параметров nfqws2 и конфига zapret2
- Команды [blockcheckw](https://github.com/rcd27/blockcheckw) для параллельного сканирования стратегий
- Пошаговые workflow-ы установки и диагностики
- Типичные проблемы и решения

## Установка

```bash
npm install -g zapret2-mcp
```

## Подключение

### Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "zapret2": {
      "command": "npx",
      "args": ["zapret2-mcp"]
    }
  }
}
```

Никаких переменных окружения не нужно — сервер только отдаёт знания.

## MCP API

### Tool

| Tool | Описание |
|---|---|
| `query-zapret-knowledge` | Поиск по базе знаний. Параметры: `topic` (строка), `tokens` (лимит, опционально) |

```
query-zapret-knowledge({ topic: "split2 strategy" })
query-zapret-knowledge({ topic: "blockcheckw scan", tokens: 2000 })
query-zapret-knowledge({ topic: "troubleshooting dns" })
```

### Prompts

| Prompt | Описание |
|---|---|
| `setup-zapret` | Пошаговая установка zapret2 |
| `find-bypass-strategy` | Поиск рабочей стратегии через blockcheckw |
| `troubleshoot` | Диагностика проблем |
| `strategy-knowledge` | Полный справочник стратегий DPI bypass |

## Пример использования

> "Настрой zapret2 на моём роутере, найди рабочую стратегию для youtube.com"

Агент:
1. Вызывает `query-zapret-knowledge({ topic: "setup installation" })` — получает инструкции
2. Выполняет команды установки в терминале
3. Вызывает `query-zapret-knowledge({ topic: "blockcheckw scan" })` — узнаёт как искать стратегии
4. Запускает `blockcheckw scan -d youtube.com`
5. Вызывает `query-zapret-knowledge({ topic: "strategy selection criteria" })` — понимает как выбрать лучшую
6. Применяет стратегию в конфиг, запускает сервис

## Разработка

```bash
git clone --recurse-submodules https://github.com/rcd27/zapret2-mcp.git
cd zapret2-mcp
npm install
npm run build
npm test
```

## Лицензия

MIT
