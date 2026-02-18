# Changelog

## [0.3.2] - 2026-02-18

### Fixed
- **`updateConfig` не записывал значения** — добавлен `sudo`, `set -e`, запись через `tee` вместо redirect (BUG-01)
- **Service tools не работали с systemd** — `startService`, `stopService`, `restartService` теперь автоматически определяют systemd unit и используют `systemctl` (BUG-02/03)
- **`installZapret` ставил FWTYPE=nftables без nft** — автодетект: `nft` есть → `nftables`, иначе → `iptables` (BUG-04)
- **`installZapret` Permission denied при клонировании** — `mkdir -p` + clone в существующий каталог вместо создания через `git clone` (bugreport #1)
- **`runBlockcheck` оставлял зомби-процессы и мусорные fw rules** — systemd-aware stop, `setsid` для process group, cleanup nfqws2 и mangle rules после завершения (BUG-05/10)
- **`runBlockcheck` возвращал stdout как error** — non-zero exit с полезным stdout обрабатывается как успешный результат (BUG-06)
- **`runBlockcheck` параметры не передавались в blockcheck2.sh** — добавлен `test_number` в stdin (формат: `test_number\ndomain\nip_version`) (bugreport #5)
- **`verifyBypass` давал ложно-положительный результат** — добавлена проверка firewall rules (iptables/nft), новые поля `firewallRulesCount` и `bypassConfirmed` (BUG-08)

### Changed
- **`getStatus`**: `nftRulesCount` → `firewallRulesCount` — считает rules по FWTYPE из конфига (nft или iptables), добавлено поле `fwtype` (UX-05)
- `updateConfig` показывает новое значение ключа после записи (UX-07)

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
