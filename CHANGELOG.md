# Changelog

## [0.7.10](https://github.com/rcd27/zapret2-mcp/compare/v0.7.9...v0.7.10) (2026-04-15)


### Bug Fixes

* **blobs:** три несуществующих блоба, добавлены недостающие, фикс синтаксиса, уточнения ([83a3eea](https://github.com/rcd27/zapret2-mcp/commit/83a3eea90cce90c90b29f4320bc0ada8ef633367))
* **config:** остальные правки по разделу ([9a397ac](https://github.com/rcd27/zapret2-mcp/commit/9a397ac24fbd27194828e8bb6ea2ad08050f3e53))
* **desync-profiles:** voice в дискорде ([e20d97f](https://github.com/rcd27/zapret2-mcp/commit/e20d97f98b3eff83bdbe659a67587cc735f23aa8))
* **discor-bypass:** актуальный синтаксис ([2aa0104](https://github.com/rcd27/zapret2-mcp/commit/2aa0104e3205ab00adfa78fc5c93272837521c3a))
* **obsidian-gui:** mass-fixes ([f5648c5](https://github.com/rcd27/zapret2-mcp/commit/f5648c5c9954a7f275a93af16500724d39f8187e))
* **platforms:** незначительные правки по платформам ([282e3b8](https://github.com/rcd27/zapret2-mcp/commit/282e3b86bcdb43cfceb5c79491244f301e61661a))
* **tspu:** username ([de99265](https://github.com/rcd27/zapret2-mcp/commit/de99265e6979bb1ee7129fb34265a70c00ccb2fd))
* **uci:** массовые правки, удаление CLI утилиты ([c65e2ae](https://github.com/rcd27/zapret2-mcp/commit/c65e2ae544b521ec6ef6db173b5ec58f4999bd5c))
* **udp-quick:** udp-len ([ec22599](https://github.com/rcd27/zapret2-mcp/commit/ec225995b642c363becbed00b56154c562f50278))

## [0.7.9](https://github.com/rcd27/zapret2-mcp/compare/v0.7.8...v0.7.9) (2026-04-02)


### Bug Fixes

* **ci-cd:** [@latest](https://github.com/latest) -&gt; [@11](https://github.com/11) в npm ([57347de](https://github.com/rcd27/zapret2-mcp/commit/57347de840f76bdd2578d414961a2e1bc86c5328))

## [0.7.8](https://github.com/rcd27/zapret2-mcp/compare/v0.7.7...v0.7.8) (2026-04-02)


### Bug Fixes

* **ci-cd:** вернул registry ([db7f031](https://github.com/rcd27/zapret2-mcp/commit/db7f031f1c694f8c5c9549de915938921be53e59))

## [0.7.7](https://github.com/rcd27/zapret2-mcp/compare/v0.7.6...v0.7.7) (2026-04-02)


### Bug Fixes

* **ci-cd:** убран npm install, чтобы при релизе github-action не валился ([ed2b089](https://github.com/rcd27/zapret2-mcp/commit/ed2b08909d45a264ac08ed3a660a57f8ba54e307))

## [0.7.6](https://github.com/rcd27/zapret2-mcp/compare/v0.7.5...v0.7.6) (2026-04-02)


### Bug Fixes

* **multiple:** фикс ряда статей согласно аудиту ([34511e4](https://github.com/rcd27/zapret2-mcp/commit/34511e4157a2e66f0fcf31e5c3c8a2b2858c2fe4))

## [0.7.5](https://github.com/rcd27/zapret2-mcp/compare/v0.7.4...v0.7.5) (2026-04-01)


### Bug Fixes

* **blockcheckw:** правки с ссылкой на источник ([bed1603](https://github.com/rcd27/zapret2-mcp/commit/bed160349e392eb17a0d8e1ce50d01009794af09))
* **dpi-types:** корректный lua-синтаксис, ipfrag2 заменён на multidisorder в качестве рекомендации, удалён несуществующий параметр ([b2f7921](https://github.com/rcd27/zapret2-mcp/commit/b2f79214485db04b4c5f5c5cbcfcd1b5574cbb2d))
* **find-strategy:** убраны рефернсы к V1 стратегиям ([fcf7325](https://github.com/rcd27/zapret2-mcp/commit/fcf73253c4f8193b31cd8e74c57cd4c858548f01))
* **http-specific:** убраны галлюцинации и ошибки нэйминга ([dbb0720](https://github.com/rcd27/zapret2-mcp/commit/dbb0720f7e7e06bd6eb3eeaba39f36dfe524e835))
* **nfqws2-options:** выпилены ссылки на nfqws, добавлены fooling параметры и payload types ([7501b75](https://github.com/rcd27/zapret2-mcp/commit/7501b75fe1bbd4065fe4c9780fc400c66e53dea7))
* **setup:** DoH/DoT в качестве prereq, остальные тревоания к системе ([4776237](https://github.com/rcd27/zapret2-mcp/commit/477623779c7d372213d57dbfe522ec8e06912fb5))
* **tcp-segmentation:** убран несуществующий параметр, правки по claims ([7c1c945](https://github.com/rcd27/zapret2-mcp/commit/7c1c94548e757897f0205998a4e7d59f4df7121f))
* **tizen:** правки насчёт отсутствия альтернатив YouTube на Tizen ([6513205](https://github.com/rcd27/zapret2-mcp/commit/6513205b0323a1c7ce8d8e21e69ff5ea3c04d1d7))
* **zapret2-config:** мелкие правки по конфигу zapret2 ([d40c4cf](https://github.com/rcd27/zapret2-mcp/commit/d40c4cf5faf8debe7fc429378af60f2a43dae9e1))

## [0.7.4](https://github.com/rcd27/zapret2-mcp/compare/v0.7.3...v0.7.4) (2026-03-30)


### Features

* **knowledge:** fallback до первоисточников, чтобы агент не гуглил лишнее ([e25c950](https://github.com/rcd27/zapret2-mcp/commit/e25c950cd90b81762484acfbda620844f4f03f16))
* **knowledge:** обогащение статей стратегиями из community ([6e737f6](https://github.com/rcd27/zapret2-mcp/commit/6e737f65d831173b6476df3f231c5491295ed619))
* **knowledge:** проблемы с ютубом и особенности zapret2 на десктопе ([5cd3110](https://github.com/rcd27/zapret2-mcp/commit/5cd3110aab0975c6c60be5135f3a93487584ad28))
* **knowledge:** цикл выжимок из статей на obsidian ([ea072e2](https://github.com/rcd27/zapret2-mcp/commit/ea072e222b478d04f44d0f6b98fd552b06a25d41))


### Bug Fixes

* **contract:** явное указание языка ([1b4ca5b](https://github.com/rcd27/zapret2-mcp/commit/1b4ca5b62f2f3b69390db080e440a854cb4aa840)), closes [#9](https://github.com/rcd27/zapret2-mcp/issues/9)

## [0.7.3](https://github.com/rcd27/zapret2-mcp/compare/v0.7.2...v0.7.3) (2026-03-28)


### Bug Fixes

* **readme:** актуальное состояние базы знаний в readme ([c91441c](https://github.com/rcd27/zapret2-mcp/commit/c91441ce8ef223bbcfe15619a01ba5f2fa7066ad))

## [0.7.2](https://github.com/rcd27/zapret2-mcp/compare/v0.7.1...v0.7.2) (2026-03-28)


### Features

* **knowledge:** ряд статей и правок, согласно опыту community ([e7769c0](https://github.com/rcd27/zapret2-mcp/commit/e7769c0cadc372e679c3bf5dff2e234069629e41))
* **knowledge:** стратегии сообщества + данные по ночным перезагрузкам + правки ([2173d3b](https://github.com/rcd27/zapret2-mcp/commit/2173d3bc39711cc1ee2bdf779effff6d6ffd8a5c))

## [0.7.1](https://github.com/rcd27/zapret2-mcp/compare/v0.7.0...v0.7.1) (2026-03-28)


### Features

* **knowledge:** deep-wiki, как источник №1 ([5ed5d46](https://github.com/rcd27/zapret2-mcp/commit/5ed5d4637f2be2a5710f60bf8a54ab38eaaddb85))

## [0.7.0](https://github.com/rcd27/zapret2-mcp/compare/v0.6.1...v0.7.0) (2026-03-28)


### ⚠ BREAKING CHANGES

* **retrival:** техника чанков для retrieve логики, чтобы ИИ агенту не жечь токены

### Features

* **retrival:** добавлен context для более точного ранжирования чанков ([568e10d](https://github.com/rcd27/zapret2-mcp/commit/568e10dcadf36ca24a4984988fc3398eb171c906))
* **retrival:** техника чанков для retrieve логики, чтобы ИИ агенту не жечь токены ([e00cd32](https://github.com/rcd27/zapret2-mcp/commit/e00cd32ec82d6dd7cd89c57246524d810d12edf6))

## [0.6.1](https://github.com/rcd27/zapret2-mcp/compare/v0.6.0...v0.6.1) (2026-03-28)


### Features

* **knowledge:** особенности UCI конфигураций ([87183b0](https://github.com/rcd27/zapret2-mcp/commit/87183b04c0cde28a2afdfcf649531bb312367fc7))
* **knowledge:** статья про blobs ([107e3c1](https://github.com/rcd27/zapret2-mcp/commit/107e3c162ff8ce0eb57ac48061c92b5b5e5ffa52))
* **knowledge:** статья про Discord ([f06bced](https://github.com/rcd27/zapret2-mcp/commit/f06bced1feaab72d27ea0599a8155fda9fb1f65a))
* **knowledge:** типичные проблемы с IPV6 ([7730dd9](https://github.com/rcd27/zapret2-mcp/commit/7730dd9fee564df91f0c24eb4a6c5631ec9324ab))


### Bug Fixes

* **readme:** переработка readme ([1f45a84](https://github.com/rcd27/zapret2-mcp/commit/1f45a84c9cca188b8f16713ff11c8327273ee7f3))
* **reference:** ссылки на оригинальные статьи по ТСПУ ([c275b60](https://github.com/rcd27/zapret2-mcp/commit/c275b60396d7b00a4f1cc97515e7e1c616eaacdd))

## [0.6.0](https://github.com/rcd27/zapret2-mcp/compare/v0.5.2...v0.6.0) (2026-03-28)


### ⚠ BREAKING CHANGES

* **contract:** пересмотрен подход к составлению статей

### Features

* **contract:** пересмотрен подход к составлению статей ([30ae044](https://github.com/rcd27/zapret2-mcp/commit/30ae0446f70a826f72c03f1294faec0bb795af63))
* **knowledge:** возможности с MTProto ([b5c4cb1](https://github.com/rcd27/zapret2-mcp/commit/b5c4cb190bdebef89719d4432be54165c3d44d50))


### Bug Fixes

* **ci-cd:** trusted publishing ([d782a13](https://github.com/rcd27/zapret2-mcp/commit/d782a13e9624c43a02f2e7f65e0469d6c0b02a7a))
* **ci-cd:** выпелен environment из релиза ([a165212](https://github.com/rcd27/zapret2-mcp/commit/a165212d70bcb52fd140f89d413273ff8463281c))
* **knowledge:** шапка для статей ([fba333c](https://github.com/rcd27/zapret2-mcp/commit/fba333c14dcf53a80d7b3077c5b5263263a298a7))

## [0.5.2](https://github.com/rcd27/zapret2-mcp/compare/v0.5.1...v0.5.2) (2026-03-28)


### Features

* **knowledge:** добавлены доки про ТСПУ ([23f6b12](https://github.com/rcd27/zapret2-mcp/commit/23f6b12cd560f70ad529e0d4bfe150cfe8b0033b))
* **knowledge:** конфликты на OpenWRT ([20df465](https://github.com/rcd27/zapret2-mcp/commit/20df4651cbc310bb57ba5528a826d12d676a21c6))
* **knowledge:** миграции стратегий V1 -&gt; V2 ([b9da20f](https://github.com/rcd27/zapret2-mcp/commit/b9da20f8da675da536555d9efa6bd5122032f03c))
* **knowledge:** проблемы с QUICK ([b41ed68](https://github.com/rcd27/zapret2-mcp/commit/b41ed68db85fa1700502e172f5bc7b5e2440f1fc))
* **knowledge:** статья про смарт-тв ([a04cb01](https://github.com/rcd27/zapret2-mcp/commit/a04cb01b5f92dba14e7da3b69674b41bc5f7c67e))

## [0.5.1](https://github.com/rcd27/zapret2-mcp/compare/v0.5.0...v0.5.1) (2026-03-28)


### Bug Fixes

* **docs:** исправлен полностью устаревший README.md ([8f94e86](https://github.com/rcd27/zapret2-mcp/commit/8f94e86531802db7b9a05225ebe4b1d88a05b072))

## [0.5.0](https://github.com/rcd27/zapret2-mcp/compare/v0.4.0...v0.5.0) (2026-03-28)


### ⚠ BREAKING CHANGES

* **pivot:** CI/CD для автоматического версионирования и деплоя в NPM
* **pivot:** переход в парадигму knowledge-base

### Features

* add removeZapret2 tool with unit tests ([b75a26e](https://github.com/rcd27/zapret2-mcp/commit/b75a26e6c2e97205764c4b729acf5362b6b6c8b6))
* add runDpiDetector tool for DPI blocking diagnosis ([76a24c7](https://github.com/rcd27/zapret2-mcp/commit/76a24c77510790ad7adadbd08ea4ca4a911e3fea))
* **pivot:** CI/CD для автоматического версионирования и деплоя в NPM ([326bf6c](https://github.com/rcd27/zapret2-mcp/commit/326bf6c97c616ada5278e6ae14c220a378126c15))
* **pivot:** переход в парадигму knowledge-base ([1d53b78](https://github.com/rcd27/zapret2-mcp/commit/1d53b7842f781f0075e2682d1e97148619de986b))
* **prompts:** add strategy-knowledge prompt ([ef01999](https://github.com/rcd27/zapret2-mcp/commit/ef0199970504599163a3730f597c1bb203facb9a))
* **verifyBypass:** add interface param, routeTo/wanInterface fields, fix bypassConfirmed logic ([4f44a18](https://github.com/rcd27/zapret2-mcp/commit/4f44a18666026ea5aaa3e4c35bad51c20d587993))
* zapret2-mcp v0.3.0 ([9ee87f9](https://github.com/rcd27/zapret2-mcp/commit/9ee87f99338f7c028dd80b661029bf01a2d44d06))


### Bug Fixes

* critical workflow bugs from user-story testing (v0.3.1) ([a370abc](https://github.com/rcd27/zapret2-mcp/commit/a370abc22c7365efc9f908b29e4ad8c52383ad33))
* installZapret clone permissions and runBlockcheck stdin format ([ba09230](https://github.com/rcd27/zapret2-mcp/commit/ba09230a7d2f539f8ae3802987b203a26cf952c7))
* **local:** sudo for `local` installation ([7e75130](https://github.com/rcd27/zapret2-mcp/commit/7e7513049fc520623346d0b33cbdd5db3e8e204d))
* resolve 10 bugs found during full-cycle reinstall testing (v0.3.3) ([f891829](https://github.com/rcd27/zapret2-mcp/commit/f891829b36c4a4d2cdcbfdb966dd25cbae1df77f))

## [0.3.6] - 2026-03-04

### Added
- **`runDpiDetector` tool** — запуск Docker-образа `dpi-detector` для диагностики типов DPI-блокировок (TLS SNI, TCP throttling, UDP/QUIC). Тяжёлая операция (~3 мин), полный лог сохраняется в resources. Используется перед `runBlockcheck` для понимания характера блокировки.
- **Unit-тесты `runDpiDetector`** — 8 тестов: docker flags, log URI, defaults, валидация параметров, пустой вывод, partial output на ошибке, fallback на LocalExecutor из Docker-режима, обработка exec failure.
- **Новый тип логов `dpi-detector`** — сохранение в `~/.zapret2-mcp/logs/dpi-detector/`, доступ через `zapret2://logs/dpi-detector/{timestamp}`.
- **Workflow #5 DPI diagnosis** — `runDpiDetector → analyze → runBlockcheck → updateConfig → restartService → verifyBypass`.

### Changed
- **Промпт `troubleshoot`** — добавлен опциональный шаг 6: запуск `runDpiDetector` для диагностики типов блокировок.
- **Промпт `overview`** — обновлён: 15 tools, добавлен `runDpiDetector` в секцию инструментов и workflow #5.

## [0.3.5] - 2026-02-19

### Added
- **Новый промпт `strategy-knowledge`** — полный справочник по стратегиям обхода DPI для LLM: все семейства стратегий (TCP сегментация, фейки, HTTP, window, UDP/QUIC, circular оркестрация), fooling-опции (md5sig, badsum, ip_autottl, tcp_ts), маркеры позиций, типы DPI с рекомендованными подходами, протокол-специфичные заметки (TLS 1.2 vs 1.3, QUIC, HTTP)

### Changed
- **Промпт `find-bypass-strategy` обогащён knowledge base** — добавлены: как читать результаты blockcheck (AVAILABLE/UNAVAILABLE), критерии выбора стратегии (стабильность > скорость), как конструировать NFQWS2_OPT из результатов, рекомендации по fooling-методам, circular orchestration для отказоустойчивости
- **Промпт `troubleshoot` обогащён диагностикой** — добавлена секция типичных причин неработающих стратегий: IP-блокировка vs DPI, неправильный fooling для фейков, проблемы с TTL (autottl vs фиксированный), устаревшие стратегии, отсутствие NFQUEUE-модуля

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
