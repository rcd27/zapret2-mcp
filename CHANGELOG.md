# Changelog

## [0.3.0] - 2026-02-18

### Added
- **3 новых tools** (итого 13):
  - `detectSystem` — определение окружения (OS, arch, init system, WAN, DNS, NFQUEUE, container)
  - `configureDns` — настройка DNS-резолвера (resolv.conf или systemd-resolved)
  - `createSystemdService` — создание systemd unit для автозапуска на Linux-десктопе
- **Новый prompt** `setup-desktop` — полный пайплайн установки для Linux-десктопа с systemd
- Автодетекция WAN-интерфейса через `ip route get 8.8.8.8` при установке (`installZapret`)
- Расширенные проверки в `checkPrerequisites`: OS, init system, NFQUEUE module, WAN-интерфейс, DNS-резолверы, container detection, `base64`
- Документация по поддержке Windows (`docs/windows-support.md`)

### Fixed
- **Shell injection в `updateConfig`** — значение теперь передаётся через base64 + awk ENVIRON вместо sed с минимальным экранированием
- **maxBuffer 1MB → 10MB** во всех executor'ах — предотвращает обрезку вывода blockcheck2.sh
- Опечатка в `docker/entrypoint.sh` (`/opt/zapret` → `/opt/zapret2`)

### Changed
- Промпт `setup-zapret` начинается с `detectSystem` как шаг 1
- Промпт `troubleshoot` включает `detectSystem` и `configureDns`
- Промпт `overview` обновлён: 13 tools, 5 prompts, два workflow (router/desktop)
- README.md полностью переписан на русском с таблицей поддерживаемых платформ

## [0.2.0] - 2026-02-17

### Added
- **Абстракция транспорта** `CommandExecutor` — 3 реализации:
  - `LocalExecutor` — выполнение через `bash -c`
  - `DockerExecutor` — через `docker exec`
  - `SshExecutor` — через ssh
- **3 новых tools** (итого 10):
  - `checkPrerequisites` — проверка окружения
  - `installZapret` — установка с нуля
  - `verifyBypass` — проверка сетевой связности
- **MCP Resources** — персистентные логи в `~/.zapret2-mcp/logs/`
- **4 MCP Prompts**: `setup-zapret`, `find-bypass-strategy`, `troubleshoot`, `overview`
- npm-пакет с CLI entry point (`npx zapret2-mcp`)
- Unit и интеграционные тесты

### Changed
- Все tools мигрированы с `dockerExec()` на `getExecutor().exec()`

## [0.1.0] - 2026-02-17

### Added
- Начальная реализация MCP-сервера с 7 tools
- Docker-окружение для разработки (OpenWrt rootfs)
- Tools: `getStatus`, `startService`, `stopService`, `restartService`, `getConfig`, `updateConfig`, `runBlockcheck`
