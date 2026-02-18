# zapret2-mcp

MCP-сервер для управления [zapret2](https://github.com/bol-van/zapret2) — инструментом обработки сетевых пакетов. Позволяет AI-агентам автоматизировать установку, настройку и диагностику zapret2 через [Model Context Protocol](https://modelcontextprotocol.io/).

## Поддерживаемые платформы

| Платформа | Статус | Транспорт |
|---|---|---|
| OpenWrt (роутер) | Полная поддержка | `ssh` |
| Linux (десктоп/сервер) | Полная поддержка | `local` |
| Docker (разработка/тестирование) | Полная поддержка | `docker` |
| macOS | Не поддерживается | — |
| Windows (нативно) | Не поддерживается | — |
| Windows (WSL2) | Работает через `local` | `local` |

zapret2 поддерживает Windows нативно через [zapret-win-bundle](https://github.com/bol-van/zapret-win-bundle), но архитектура (WinDivert, `.cmd`-скрипты, другие пути) полностью отличается от Linux. Наш MCP-сервер работает только с Linux/OpenWrt-окружениями. Подробнее: [docs/windows-support.md](docs/windows-support.md).

## Установка

```bash
npm install -g zapret2-mcp
```

Или запуск без установки:

```bash
npx zapret2-mcp
```

## Настройка MCP-клиента

### Claude Desktop

Добавить в `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "zapret2": {
      "command": "npx",
      "args": ["zapret2-mcp"],
      "env": {
        "ZAPRET2_MODE": "ssh",
        "ZAPRET2_SSH_HOST": "192.168.1.1"
      }
    }
  }
}
```

### Claude Code

Добавить в `.mcp.json` в корне проекта или в `~/.claude/mcp.json` глобально:

```json
{
  "mcpServers": {
    "zapret2": {
      "command": "npx",
      "args": ["zapret2-mcp"],
      "env": {
        "ZAPRET2_MODE": "ssh",
        "ZAPRET2_SSH_HOST": "192.168.1.1"
      }
    }
  }
}
```

### Cursor

Добавить в настройки MCP:

```json
{
  "zapret2": {
    "command": "npx",
    "args": ["zapret2-mcp"],
    "env": {
      "ZAPRET2_MODE": "docker"
    }
  }
}
```

## Режимы транспорта

Сервер выполняет команды на целевой машине через один из трёх транспортов.

### `ssh` — удалённый роутер (продакшн)

Подключение по SSH к OpenWrt-роутеру. Основной режим для реального использования.

```json
{ "ZAPRET2_MODE": "ssh", "ZAPRET2_SSH_HOST": "192.168.1.1" }
```

### `local` — локальная машина

Выполнение команд через `bash -c` на той же машине, где запущен MCP-сервер. Для Linux-десктопов и WSL2.

```json
{ "ZAPRET2_MODE": "local" }
```

### `docker` — контейнер (по умолчанию)

Выполнение через `docker exec` в контейнере с OpenWrt. Для разработки и тестирования.

```json
{ "ZAPRET2_MODE": "docker" }
```

### Переменные окружения

| Переменная | По умолчанию | Описание |
|---|---|---|
| `ZAPRET2_MODE` | `docker` | Транспорт: `local`, `docker`, `ssh` |
| `ZAPRET2_CONTAINER_NAME` | `zapret2-openwrt` | Имя контейнера (режим docker) |
| `ZAPRET2_SSH_HOST` | — (обязательно для ssh) | SSH-хост |
| `ZAPRET2_SSH_USER` | `root` | SSH-пользователь |
| `ZAPRET2_SSH_KEY` | — (опционально) | Путь к SSH-ключу |
| `ZAPRET2_SSH_PORT` | `22` | SSH-порт |

## Tools (13)

### Определение системы

| Tool | Описание |
|---|---|
| `detectSystem` | Определение окружения: ОС, архитектура, init-система, WAN-интерфейс, DNS, NFQUEUE, контейнер |

### Управление сервисом

| Tool | Описание |
|---|---|
| `getStatus` | Статус сервиса: запущен ли, PID, количество nftables-правил, флаг enabled |
| `startService` | Запуск zapret2 (логи сохраняются в resources) |
| `stopService` | Остановка zapret2 (логи сохраняются в resources) |
| `restartService` | Перезапуск zapret2 (логи сохраняются в resources) |

### Конфигурация

| Tool | Описание |
|---|---|
| `getConfig` | Чтение конфига zapret2 (целиком или по ключу) |
| `updateConfig` | Обновление параметра конфига (key=value, снапшот сохраняется в resources) |
| `configureDns` | Настройка DNS-резолвера (resolv.conf или systemd-resolved) |

### Установка и диагностика

| Tool | Описание |
|---|---|
| `checkPrerequisites` | Проверка окружения: инструменты, ОС, init-система, NFQUEUE, сеть |
| `installZapret` | Полная установка: клонирование, скачивание бинарников, базовый конфиг |
| `runBlockcheck` | Запуск blockcheck2.sh для поиска рабочих сетевых стратегий (~5 мин, лог в resources) |
| `verifyBypass` | Проверка сетевой связности: DNS, HTTP, статус nfqws2 |

### Интеграция с десктопом

| Tool | Описание |
|---|---|
| `createSystemdService` | Создание systemd unit для автозапуска zapret2 на Linux-десктопе |

## Prompts (5)

MCP-промпты — пошаговые инструкции для типичных сценариев:

| Prompt | Описание |
|---|---|
| `setup-zapret` | Установка с нуля (универсальная) |
| `setup-desktop` | Установка на Linux-десктоп с systemd, DNS и автозапуском |
| `find-bypass-strategy` | Поиск рабочей сетевой стратегии через blockcheck |
| `troubleshoot` | Диагностика проблем |
| `overview` | Справочник по всем tools, resources и workflows |

## MCP Resources

Tools сохраняют вывод в файлы для персистентной истории. Агент может возвращаться к предыдущим результатам и сравнивать прогоны.

- **URI:** `zapret2://logs/{type}/{timestamp}`
- **Типы логов:** `blockcheck`, `service`, `config`
- **Хранение:** `~/.zapret2-mcp/logs/`

## Сценарии использования

### Роутер (OpenWrt по SSH)

```
detectSystem → checkPrerequisites → installZapret → updateConfig(NFQWS2_ENABLE=1)
→ startService → verifyBypass
```

### Linux-десктоп

```
detectSystem → checkPrerequisites → installZapret → configureDns
→ createSystemdService → updateConfig(NFQWS2_ENABLE=1) → startService → verifyBypass
```

### Поиск сетевой стратегии

```
stopService → runBlockcheck(domain) → прочитать лог resource
→ updateConfig(NFQWS2_OPT=...) → restartService → verifyBypass(domain)
```

### Диагностика

```
detectSystem → getStatus → getConfig → checkPrerequisites → verifyBypass(domain)
→ анализ результатов
```

## Разработка

```bash
git clone https://github.com/your-org/zapret2-mcp.git
cd zapret2-mcp
npm install
npm run build      # TypeScript → build/
npm run dev        # MCP Inspector
npm test           # Unit-тесты (vitest)
npm run test:integration  # Интеграционные тесты (требуется Docker)
```

### Docker-окружение для разработки

```bash
cd docker
docker compose build && docker compose up -d
```

Контейнер `zapret2-openwrt`: OpenWrt SNAPSHOT, `privileged: true`, `network_mode: host`.

## Лицензия

MIT
