# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Описание проекта

MCP-сервер для управления zapret2 (инструмент обработки сетевых пакетов от bol-van) на OpenWrt-роутерах и Linux-десктопах. Позволяет LLM-агенту автоматизировать установку, настройку и диагностику zapret2 через Model Context Protocol.

## Docker-окружение для разработки

### Запуск

```bash
cd docker
docker compose build && docker compose up -d
docker exec -it zapret2-openwrt bash
```

### Детали окружения

- Базовый образ: `openwrt/rootfs:x86_64` (SNAPSHOT, пакетный менеджер `apk`, не `opkg`)
- Контейнер работает в `privileged` + `network_mode: host` — необходимо для NFQUEUE
- Данные zapret2 персистентны через Docker volume `/opt/zapret2`
- Система определяется как Linux (не OpenWrt), т.к. нет procd init — это нормально

### Установка zapret2 в контейнере (первый запуск)

```bash
# Клонировать репозиторий
cd /opt && git clone https://github.com/bol-van/zapret2.git zapret2

# Скачать бинарники из релиза
cd /tmp
curl -sLO 'https://github.com/bol-van/zapret2/releases/download/v0.9.4.1/zapret2-v0.9.4.1.tar.gz'
tar xzf zapret2-v0.9.4.1.tar.gz
cp -r zapret2-v0.9.4.1/binaries/* /opt/zapret2/binaries/

# Установить бинарники
cd /opt/zapret2 && sh install_bin.sh

# Интерактивная установка (ответить Y на первый вопрос)
sh install_easy.sh

# Включить nfqws2
sed -i 's/NFQWS2_ENABLE=0/NFQWS2_ENABLE=1/' /opt/zapret2/config
/opt/zapret2/init.d/sysv/zapret2 start
```

### Управление сервисом

```bash
/opt/zapret2/init.d/sysv/zapret2 start|stop|restart
```

## Архитектура zapret2

- `nfqws2` — основной демон дезинсинхронизации (через NFQUEUE)
- `blockcheck2.sh` — подбор сетевых параметров
- `install_easy.sh` / `install_prereq.sh` / `install_bin.sh` — скрипты установки
- Конфиг: `/opt/zapret2/config` (переменная `NFQWS2_OPT` — параметры обработки пакетов)
- Lua-скрипты: `lua/zapret-antidpi.lua`, `zapret-auto.lua` — логика desync
- Init-скрипт: `init.d/sysv/zapret2`
- Путь установки: строго `/opt/zapret2`

## MCP-сервер

### Сборка и запуск

```bash
npm install
npm run build    # TypeScript → build/
npm start        # build + запуск сервера
npm run dev      # запуск через MCP Inspector
npm test         # unit-тесты
npm run test:integration  # интеграционные тесты (требуется Docker)
```

### Архитектура MCP-сервера

- `src/index.ts` — точка входа, инициализация executor, регистрация tools, resources, prompts, StdioTransport
- `src/executor/` — абстракция транспорта (CommandExecutor interface):
  - `types.ts` — интерфейсы `ExecResult`, `CommandExecutor`
  - `local.ts` — `LocalExecutor` (прямое выполнение bash на хосте)
  - `docker.ts` — `DockerExecutor` (через `docker exec`)
  - `ssh.ts` — `SshExecutor` (через ssh бинарь, без библиотек)
  - `factory.ts` — фабрика: читает `ZAPRET2_MODE` из env
  - `index.ts` — barrel re-export
- `src/executorInstance.ts` — синглтон executor (initExecutor/getExecutor)
- `src/logStore.ts` — персистентное хранение логов в `~/.zapret2-mcp/logs/`
- `src/resources.ts` — MCP Resources (resource template `zapret2://logs/{type}/{timestamp}`)
- `src/prompts.ts` — MCP Prompts (5 пошаговых сценариев)
- `src/tools/` — 13 MCP tools:
  - `detectSystem` — определение окружения (OS, arch, init, WAN, DNS, NFQUEUE, контейнер)
  - `getStatus` — статус сервиса (PID, nft rules, enabled)
  - `startService` / `stopService` / `restartService` — управление сервисом
  - `getConfig` — чтение конфига (целиком или по ключу)
  - `updateConfig` — обновление параметра конфига (key=value, base64-safe)
  - `configureDns` — настройка DNS (resolv.conf или systemd-resolved)
  - `runBlockcheck` — запуск blockcheck2.sh для подбора сетевых стратегий
  - `checkPrerequisites` — проверка окружения (tools, OS, init, NFQUEUE, arch, network)
  - `installZapret` — полная установка zapret2 с нуля (auto-detect WAN)
  - `verifyBypass` — проверка сетевой связности
  - `createSystemdService` — создание systemd unit для автозапуска на десктопе

### MCP Prompts (5)

- `setup-zapret` — универсальная установка с нуля
- `setup-desktop` — установка на Linux-десктоп с systemd, DNS, автозапуском
- `find-bypass-strategy` — поиск рабочей сетевой стратегии через blockcheck
- `troubleshoot` — диагностика проблем
- `overview` — справочник по всем tools и workflows

### MCP Resources — логи с историчностью

Tools сохраняют свой вывод в файлы для персистентной истории. Агент может возвращаться к предыдущим результатам и сравнивать прогоны.

**Структура логов:** `~/.zapret2-mcp/logs/{blockcheck,service,config}/{timestamp}.log`

**Формат файла:** первая строка — JSON-метаданные, пустая строка, полный вывод.

**Resource template URI:** `zapret2://logs/{type}/{timestamp}`

Какие tools сохраняют логи:
- `runBlockcheck` → `blockcheck/` (полный вывод blockcheck2.sh, краткий ответ в tool response)
- `startService`/`stopService`/`restartService` → `service/` (вывод init-скрипта)
- `updateConfig` → `config/` (снапшот конфига **до** изменения)
- `configureDns` → `config/` (вывод настройки DNS)
- `createSystemdService` → `service/` (вывод создания systemd unit)

Клиент нотифицируется о новых логах через `server.sendResourceListChanged()`.

### Паттерны MCP SDK (@modelcontextprotocol/sdk ^1.6)

- `ResourceTemplate(uriTemplate, { list: callback | undefined })` — `list` обязателен даже если `undefined`
- `server.resource(name, template, { mimeType }, readCallback)` — `readCallback` получает `(uri, variables)`
- Для интеграционных тестов: `Client` + `StdioClientTransport` из SDK, подключение к `node build/index.js`

### Переменные окружения

| Переменная | Default | Описание |
|---|---|---|
| `ZAPRET2_MODE` | `docker` | Транспорт: `local` / `docker` / `ssh` |
| `ZAPRET2_CONTAINER_NAME` | `zapret2-openwrt` | Контейнер (docker mode) |
| `ZAPRET2_SSH_HOST` | — (обязательно для ssh) | SSH хост |
| `ZAPRET2_SSH_USER` | `root` | SSH пользователь |
| `ZAPRET2_SSH_KEY` | — (опционально) | Путь к SSH-ключу |
| `ZAPRET2_SSH_PORT` | `22` | SSH порт |

### Поддерживаемые платформы

- **Linux (десктоп/сервер)** — полная поддержка через `local`
- **OpenWrt (роутер)** — полная поддержка через `ssh`
- **Docker** — для разработки/тестирования через `docker`
- **Windows** — не поддерживается нативно (см. `docs/windows-support.md`), работает через WSL2
- **macOS** — не поддерживается

## Лицензия

MIT
