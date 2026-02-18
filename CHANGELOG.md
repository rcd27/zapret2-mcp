# Changelog

## [0.3.4] - 2026-02-18

### Added
- **`removeZapret2` tool** — полный откат установки zapret2: остановка сервиса (init script + systemd), удаление systemd unit, принудительное завершение nfqws2, очистка firewall-правил (nftables/iptables), удаление `/opt/zapret2`. DNS-настройки не откатываются.
- **Unit-тест `removeZapret2`** — 5 тестов: успешное удаление, отсутствие установки, содержимое скрипта, таймаут 60 с, обработка ошибки.

### Changed
- **`verifyBypass` — улучшена точность проверки**:
  - Добавлен параметр `interface` — явное указание WAN-интерфейса для curl; если не задан, читается `IFACE_WAN` из `/opt/zapret2/config`
  - Добавлены поля в ответ: `wanInterface` (использованный интерфейс), `routeTo` (маршрут до IP домена)
  - `bypassConfirmed` теперь определяется только по HTTP-коду (`!= 0` и `!= 000`), а не по состоянию zapret2 — корректно отражает реальную доступность сайта
  - curl теперь всегда использует `--noproxy '*'` чтобы исключить влияние системных прокси
  - Убран FIXME-комментарий
- **Тесты `verifyBypass`** — добавлено 5 новых тестов: `interface` arg, `--noproxy`, `bypassConfirmed=true`, `bypassConfirmed=false`, чтение `IFACE_WAN` из конфига; обновлены ожидаемые поля в существующем тесте

## [0.3.3] - 2026-02-18

### Fixed
- **`installZapret` неверный путь к бинарнику** — `nfqwsBinaryExists` всегда возвращал `false`, т.к. проверялся `/opt/zapret2/nfqws2` вместо `/opt/zapret2/nfq2/nfqws2` (в `checkPrerequisites` и выводе `installZapret`)
- **`installZapret force=true` не пересоздавал конфиг** — при повторной установке конфиг оставался старым; теперь `force=true` пересоздаёт и репо, и конфиг
- **`createSystemdService` `Restart=on-failure` конфликт** — при `Type=forking` + `RemainAfterExit=yes` мог вызывать бесконечные перезапуски после `stopService`; заменено на `Restart=no`
- **`updateConfig` значения без кавычек** — значения с пробелами записывались без кавычек (`KEY=val1 val2`), что при `source config` ломало парсинг; теперь всегда `KEY="value"`
- **`getStatus`/`verifyBypass` `firewallRulesCount` = `"0\n0"`** — `grep -c ... || echo 0` при нулевых совпадениях выдавал `0\n0` (невалидный JSON); заменено на `${VAR:-0}`
- **`getStatus`/`verifyBypass` `firewallRulesCount` = 0 без root** — `iptables -L` без sudo всегда давал 0 для не-root пользователей; добавлен `sudo`
- **`getStatus` `nfqws2Enabled: ""1""`** — `cut -d= -f2` возвращал значение вместе с кавычками из конфига; добавлен `tr -d '"'` для `FWTYPE` и `NFQWS2_ENABLE`
- **Шаблон конфига `installZapret` не содержал `INIT_APPLY_FW=1`** — без этого параметра init-скрипт не применял firewall-правила при старте сервиса
- **Шаблон конфига не содержал `NFQWS2_PORTS_TCP/UDP`** — без портов iptables-правила для NFQUEUE не создавались; добавлены дефолты `80,443` / `443` и пакетные счётчики из `config.default`
- **`checkPrerequisites` не проверял наличие `ipset`** — необходим для работы firewall-правил zapret2; добавлен в список инструментов

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
