# Поддержка Windows: исследование

## Поддерживает ли zapret2 Windows?

**Да.** zapret2 имеет полноценную поддержку Windows через бинарник `winws2.exe` и драйвер WinDivert. Однако архитектура сильно отличается от Linux.

## Сравнение архитектур

| Аспект | Linux / OpenWrt | Windows |
|---|---|---|
| Бинарник | `nfqws2` (native ELF) | `winws2.exe` (Cygwin PE) |
| Перехват пакетов | NFQUEUE (kernel netfilter) | WinDivert (kernel driver) |
| Фильтрация трафика | iptables / nftables правила | Встроенные параметры `--wf-tcp`, `--wf-udp` |
| Конфигурация | `/opt/zapret2/config` (shell vars) | `.cmd` preset-скрипты (`set` команды) |
| Автозапуск | systemd / init.d / procd | Task Scheduler / Windows Service |
| Установка | git clone + `install_bin.sh` | Отдельный бандл [zapret-win-bundle](https://github.com/bol-van/zapret-win-bundle) |
| Runtime | Native | Cygwin (`cygwin1.dll`) |
| Привилегии | Может сбросить через `--user` | Только Administrator / SYSTEM |

## Windows-специфика

### Установка

Используется отдельный репозиторий [zapret-win-bundle](https://github.com/bol-van/zapret-win-bundle), который включает:
- `winws2.exe` — основной бинарник zapret2
- `winws.exe` — оригинальный zapret
- `blockcheck.cmd` — анализатор стратегий сетевых стратегий
- WinDivert (`WinDivert.dll`, `WinDivert64.sys`)
- Cygwin runtime (`cygwin1.dll`)
- Preset-скрипты (`.cmd`) для типичных конфигураций
- Скрипты установки сервиса и задачи планировщика

### Поддерживаемые версии Windows

- Windows 7 SP1 x64 (требуется WinDivert 1.x через `win7/install_win7.cmd`)
- Windows 8/10/11 x64 (WinDivert 2.2.2)
- Windows 11 ARM64 (требуется Test Signing; x86_64 бинарник через эмуляцию)

### Скрипты управления

| Скрипт | Назначение |
|---|---|
| `task_create.cmd` | Создание задачи планировщика (автозапуск от SYSTEM) |
| `service_install.cmd` | Установка как Windows Service |
| `blockcheck.cmd` | Поиск рабочих стратегий сетевых стратегий |
| `windivert_delete.cmd` | Выгрузка WinDivert драйвера |
| `preset1_example.cmd` | Пример конфигурации |

### Ограничения Windows vs Linux

1. **Нет `tpws`** — прозрачный прокси не работает system-wide (только в WSL2)
2. **Нет сброса привилегий** — `winws2.exe` всегда запущен как Administrator
3. **Нет единого конфиг-файла** — вместо `/opt/zapret2/config` используются `.cmd` preset-скрипты
4. **Антивирус** — Cygwin-бинарники и WinDivert часто детектируются как угроза
5. **Secure Boot** — может потребоваться отключение или Test Signing для WinDivert
6. **ARM64** — только через эмуляцию x86_64, требуется unsigned driver

## Что это значит для zapret2-mcp

Наш MCP-сервер **не поддерживает нативный Windows** по следующим причинам:

- Все shell-скрипты написаны для bash, а не `.cmd` / PowerShell
- Пути жёстко прописаны как `/opt/zapret2` (Unix), а не `C:\zapret`
- Управление сервисом через `init.d/sysv/zapret2` — не существует на Windows
- Формат конфигурации несовместим (shell vars vs `set` в `.cmd`)
- Проверки NFQUEUE, modinfo, systemd — бессмысленны на Windows

### Альтернатива: WSL2

Windows-пользователи могут использовать zapret2-mcp через **WSL2**:

1. Установить WSL2 с любым Linux-дистрибутивом
2. Установить zapret2 внутри WSL2 (`/opt/zapret2`)
3. Запустить MCP-сервер с `ZAPRET2_MODE=local`

Это работает с текущим кодом без изменений, но с ограничениями WSL2 (сетевой стек может отличаться от хоста).

### Полноценная нативная поддержка Windows

Потребовала бы:
- Отдельные tools/скрипты на PowerShell / cmd
- Другие пути и конфиг-формат
- Интеграцию с WinDivert вместо NFQUEUE
- Управление через Task Scheduler / Windows Service
- По сути — второй MCP-сервер

## Источники

- [zapret-win-bundle](https://github.com/bol-van/zapret-win-bundle)
- [zapret2 manual (English)](https://github.com/bol-van/zapret2/blob/master/docs/manual.en.md)
- [zapret2 GitHub](https://github.com/bol-van/zapret2)
