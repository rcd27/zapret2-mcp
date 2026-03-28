---
title: Security Hardening
zapret2-version: v0.9.4.5
tags: security, seccomp, capabilities, privilege, droproot, sandbox, hardening, cap_net_admin, daemonize
source: deepwiki/bol-van/zapret2, official-docs
created: 2026-03-28
updated: 2026-03-28
---

# Security Hardening

zapret2 реализует многоуровневую защиту (defense-in-depth) для минимизации поверхности атаки. Все защитные механизмы активируются при инициализации демона, до входа в основной цикл обработки пакетов.

## Seccomp (Linux)

BPF-фильтр блокирует опасные системные вызовы на уровне ядра:

| Категория | Заблокированные syscall-ы |
|-----------|--------------------------|
| Выполнение | `execve`, `execveat` |
| Файловая система | `chmod`, `fchmod`, `chown`, `fchown` |
| Структура каталогов | `symlink`, `link`, `mkdir`, `rmdir` |
| Манипуляция процессами | `ptrace`, `process_vm_readv` |
| Сигналы | `kill`, `tkill`, `tgkill` |

Фильтр устанавливается через `prctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER)` и динамически компилируется под текущую архитектуру (x86_64, ARM, MIPS, RISC-V).

## Linux Capabilities

После биндинга привилегированных сокетов демон сбрасывает все capabilities, кроме:
- `CAP_NET_ADMIN` — управление сетевыми параметрами
- `CAP_NET_RAW` — работа с raw-сокетами

Процесс:
1. `capget`/`capset` для манипуляции capabilities
2. Определение максимальной capability через `/proc/sys/kernel/cap_last_cap`
3. `prctl(PR_CAPBSET_DROP, cap)` для каждой ненужной capability
4. Финализация без `CAP_SETCAP`

## Сброс привилегий (droproot)

Функция `droproot()` — кросс-платформенное понижение привилегий:

1. `prctl(PR_SET_KEEPCAPS, 1L)` — сохранить capabilities при смене UID
2. `initgroups()` / `setgroups()` — настройка supplementary groups
3. `setgid()` — установка primary group
4. `setuid()` — смена пользователя (**необратимая** операция)

После `droproot()` цикл обработки пакетов работает с минимальными привилегиями.

## NO_NEW_PRIVS

Флаг `prctl(PR_SET_NO_NEW_PRIVS)` запрещает повышение привилегий через `execve()` — критическая защита от цепочек эксплойтов.

## Lua Sandbox

- FFI-модуль **отключён** в LuaJIT → невозможен произвольный доступ к памяти
- Stack guards (`LUA_STACK_GUARD_ENTER/LEAVE`) защищают от corruption при C↔Lua переходах
- Lua-окружение изолировано от файловой системы и опасных операций

## Daemonization (изоляция процесса)

- `fork()` — отсоединение от родительского процесса
- `setsid()` — создание новой группы процессов
- `chdir("/")` — освобождение смонтированных файловых систем
- fd 0, 1, 2 → `/dev/null` — изоляция I/O

## Windows (winws2)

Компиляция с security-флагами:
- **ASLR/DEP**: `--nxcompat`, `--high-entropy-va`
- **Dynamic base**: `--dynamicbase`
- **Sandbox**: low integrity level + job object restrictions
- **Static linking**: защита от DLL injection

## Android

- Graceful handling отсутствия `/etc/passwd`
- Интеграция с `logcat` через `liblog`
- Статическая линковка (ограничения Bionic libc)

## Порядок инициализации

Безопасность применяется в строгом порядке:

1. Парсинг конфигурации
2. Проверка привилегий
3. Открытие PID-файла (до смены привилегий)
4. **Сброс привилегий** (`droproot`)
5. Проверка доступности файлов после смены привилегий
6. Тестирование Lua-скриптов до активации sandbox
7. **Применение seccomp** и capability restrictions
8. Инициализация raw-сокетов
9. Daemonization
10. Регистрация signal handlers
11. Инициализация Lua VM в sandbox-окружении
12. Инициализация платформенного перехвата пакетов
13. **Вход в main event loop** с минимальными привилегиями

## Рекомендации для деплоя

- **Всегда** включать droproot до непривилегированного пользователя
- Настроить права на файлы hostlists/ipsets **до** сброса привилегий
- Тестировать доступность файлов после смены привилегий
- Использовать systemd/init-скрипты с правильными security contexts
- Мониторить reload через SIGHUP для изменений конфигурации

## Философия

Компрометация одного слоя (например, escape из Lua sandbox) **не** даёт полный доступ к системе: seccomp фильтрует syscall-ы, capabilities ограничены, привилегии сброшены. Каждый слой работает независимо.
