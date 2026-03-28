---
title: Lua Scripting System
zapret2-version: v0.9.4.5
tags: lua, scripting, lua-desync, zapret-lib, zapret-antidpi, zapret-auto, zapret-obfs, obfuscation, wireguard, ippxor, udp2icmp, synhide
source: deepwiki/bol-van/zapret2, official-docs
created: 2026-03-28
updated: 2026-03-28
---

# Lua Scripting System

Lua-скриптовая система — ядро zapret2. Позволяет гибко программировать стратегии обхода DPI без перекомпиляции C-кода. Разделение: C — перехват и обработка пакетов (производительность), Lua — программируемая логика стратегий (гибкость).

## Архитектура

C-демон (nfqws2/dvtws2/winws2):
1. Перехватывает пакет через NFQUEUE / divert / WinDivert
2. Выполняет dissection и connection tracking
3. Вызывает Lua-функции, указанные через `--lua-desync=<function>:param1=val1`
4. Lua получает таблицу `desync` с разобранной структурой пакета

### Таблица `desync` (интерфейс C→Lua)

| Поле | Содержимое |
|------|-----------|
| `dis` | Разобранная L3/L4/payload структура с указателями на слои |
| `track` | Connection tracking: sequence numbers, счётчики пакетов, позиции |
| `arg` | Параметры из `--lua-desync` вызова |
| `l7proto` | Определённый L7-протокол: `tls`, `http`, `quic`, `dtls`, `wireguard` |
| `reasm_data` | Реассемблированный payload для multi-packet потоков |

## Основные библиотеки

### zapret-lib.lua (утилиты)

Фундаментальные функции:
- **Dissection**: `dissect_tls`, `dissect_http`, `dissect_url` — разбор протоколов
- **Реконструкция**: `rawsend_dissect_segmented`, `ipfrag2` — отправка модифицированных пакетов
- **Модификация**: `apply_fooling` — применение fooling-параметров (TTL, checksums, etc.)

### zapret-antidpi.lua (стратегии обхода)

Реализация DPI bypass техник:
- `fake` — отправка пакетов с невалидными checksums/TTL
- `multisplit` — сегментация payload на несколько частей
- `multidisorder` — переупорядочивание сегментов
- `oob` — out-of-band пакеты
- `syndata` — данные в SYN-пакете
- `rst` — fake RST для сброса DPI-состояния

Параметры поддерживают динамическую подстановку: `#` (длина) и `%` (значение).

### zapret-auto.lua (оркестрация)

Управление ротацией стратегий:
- **`circular`** — ротирует стратегии при сбоях (следующая стратегия при failure)
- **`repeater`** — повторяет стратегию указанное число раз
- **`standard_failure_detector`** — мониторинг ретрансмиссий и RST для детекции сбоев
- Автоматическое переключение стратегий при обнаружении блокировки

### zapret-obfs.lua (обфускация протоколов)

Продвинутые техники скрытия трафика:

#### WireGuard Obfuscation (wgobfs)
- Шифрует handshake-сообщения WireGuard (initiation, response, cookie) через AES-GCM
- Data-пакеты не шифруются (уже зашифрованы WireGuard)
- Ключ AES-128 генерируется из shared secret через HKDF-SHA256
- Overhead: 30-46 байт → нужно уменьшить MTU на WireGuard-интерфейсе
- Параметр `secret=<shared_secret>` (обязательный)
- Настраиваемый padding: min 0, max 16 байт

#### IP Protocol XOR (ippxor)
- XOR IP protocol number для маскировки под другой протокол
- Опциональный XOR payload с повторяющимся паттерном
- Если результат — TCP/UDP/ICMP, пакет переразбирается для корректной L4 dissection

#### UDP to ICMP (udp2icmp)
- Инкапсуляция UDP в ICMP без изменения размера пакета
- UDP-порты кодируются в ICMP identifier: `sport XOR dport`
- Client→Server: ICMP_ECHO, Server→Client: ICMP_ECHOREPLY

#### TCP Handshake Hiding (synhide)
- Скрывает TCP three-way handshake убирая SYN-флаг и вставляя magic-маркеры
- Режимы маркера: `x2` (reserved bits), `urp` (urgent pointer), `opt` (TCP option), `tsecr` (timestamp echo reply)
- Ghost SYN: пакет с низким TTL для создания NAT-записи без достижения сервера

## C-Lua Integration Bridge

Мост в `nfq2/lua.c`:
- Конвертирует C-структуры (`struct dissect`, `struct t_ctrack`) в Lua-таблицы
- Экспортирует ~100 C-функций: `rawsend`, `dissect`, криптография (AES-GCM, HKDF, SHA), bitwise-операции
- Stack guards (`LUA_STACK_GUARD_ENTER/LEAVE`) для предотвращения memory leaks
- FFI модуль **отключён** в LuaJIT (sandbox)

## Управление производительностью: Cutoff

Два механизма для поддержания throughput:

| Механизм | Эффект |
|----------|--------|
| `instance_cutoff(ctx, [dir])` | Отключает текущий Lua-инстанс для данного соединения |
| `lua_cutoff(ctx, [dir])` | Отключает ВСЮ Lua-обработку, возврат к чистому C |

Применяется после того, как стратегия отработала на нужных пакетах (например, после ClientHello), чтобы не тратить ресурсы на последующие пакеты потока.

## Вызов и конфигурация

```
--lua-desync=function_name:param1=value1:param2=value2
```

- Несколько `--lua-desync` в одном профиле — цепочка инстансов
- Каждый инстанс имеет свои параметры через `arg`
- Вердикты агрегируются: DROP > MODIFY > PASS
- Multi-profile через `--new` — каждый профиль со своей цепочкой

## Ключевые свойства

- **Stateless design**: каждая Lua-функция получает полный контекст пакета
- **Reassembly**: поддержка multi-packet протоколов (TLS ClientHello может быть в нескольких TCP-сегментах)
- **Dynamic substitution**: `#` (длина) и `%` (значение) в параметрах стратегий
- **Sandboxing**: Lua изолирован от файловой системы, FFI отключён, опасные операции недоступны
