---
title: UCI конфигурация и управление сервисом zapret2
zapret2-version: v0.9.4.5
tags: uci, cli, config, openwrt, init, service, management
source: official-docs
created: 2026-03-28
updated: 2026-04-15
---

# UCI конфигурация и управление сервисом zapret2

## Структура `/etc/config/zapret2`

Конфигурация zapret2 на OpenWrt хранится в формате UCI. Основные секции:

### Главная секция (main)

```
config zapret2 'main'
    option enabled '1'
    option debug '0'
    option desync_mark '0x40000000'
    option desync_mark_postnat '0x20000000'
    option postnat '1'
    option custom_scripts '1'
    option qnum '300'
    option nfqws_ports_tcp '80,443'
    option nfqws_ports_udp '443'
    option nfqws_tcp_pkt_out '25'
    option nfqws_tcp_pkt_in '5'
    option autohostlist_fail_threshold '3'
    option autohostlist_fail_time '60'
    option lua_gc '600'
    option ctrack_timeouts '60:300:60'
```

### Списки хостов (list)

```
config list 'list_hosts_user'
    option path '/opt/zapret2/ipset/zapret_hosts_user.txt'

config list 'list_hosts_youtube'
    option path '/opt/zapret2/ipset/zapret_hosts_youtube.txt'
```

### Lua скрипты (luascript)

```
config luascript 'lua_zapret_obfs'
    option path '/opt/zapret2/lua/zapret-obfs.lua'
    option enabled '0'
```

### Blobs

```
config blob 'blob_tls_clienthello_www_google_com'
    option path '/opt/zapret2/files/fake/tls_clienthello_www_google_com.bin'
    option enabled '1'
```

### Стратегии (strategy)

```
config strategy 'youtube'
    option enabled '1'
    option port '443'
    option protocol 'tcp'
    list filter_l7 'tls'
    list hostlist 'list_hosts_youtube'
    option script '--out-range=-s34228 --payload=tls_client_hello ...'
```

## Работа с UCI

```bash
# Показать всю конфигурацию
uci show zapret2

# Показать конкретный параметр
uci get zapret2.main.enabled

# Установить параметр
uci set zapret2.main.enabled='1'

# Добавить элемент в список
uci add_list zapret2.youtube.filter_l7='http'

# Удалить элемент из списка
uci del_list zapret2.youtube.filter_l7='http'

# Добавить новую стратегию
uci add zapret2 strategy
uci set zapret2.@strategy[-1].name='my_strategy'
uci set zapret2.@strategy[-1].enabled='1'
uci set zapret2.@strategy[-1].port='443'
uci set zapret2.@strategy[-1].protocol='tcp'
uci add_list zapret2.@strategy[-1].filter_l7='tls'
uci add_list zapret2.@strategy[-1].hostlist='list_hosts_user'
uci set zapret2.@strategy[-1].script='--out-range=-s34228 \
--payload=tls_client_hello \
--lua-desync=fake:blob=tls_clienthello:tcp_md5 \
--lua-desync=multisplit:pos=midsld'

# Сохранить и применить
uci commit zapret2
/etc/init.d/zapret2 restart
```

## Управление сервисом (init-скрипт)

```bash
# Стандартные procd-команды
/etc/init.d/zapret2 start      # Запустить (демоны + firewall)
/etc/init.d/zapret2 stop       # Остановить
/etc/init.d/zapret2 restart    # Полный перезапуск
/etc/init.d/zapret2 enable     # Включить автозапуск
/etc/init.d/zapret2 disable    # Отключить автозапуск

# Дополнительные команды zapret2
/etc/init.d/zapret2 start_daemons    # Запустить только демоны nfqws2
/etc/init.d/zapret2 stop_daemons     # Остановить только демоны
/etc/init.d/zapret2 restart_daemons  # Перезапустить только демоны
/etc/init.d/zapret2 start_fw         # Применить правила firewall (nftables)
/etc/init.d/zapret2 stop_fw          # Убрать правила firewall
/etc/init.d/zapret2 restart_fw       # Пересоздать правила firewall
/etc/init.d/zapret2 reload_ifsets    # Обновить списки интерфейсов (nftables)
/etc/init.d/zapret2 list_ifsets      # Показать списки интерфейсов
/etc/init.d/zapret2 list_table       # Показать nft-таблицу zapret2
```

### restart vs restart_daemons

- **restart** — полностью останавливает и запускает демоны + firewall. Применяет **все изменения**. Активные соединения прерываются.
- **restart_daemons** — перезапускает только процессы nfqws2 без пересоздания правил firewall. Быстрее, если правила не менялись.
- **reload_ifsets** — обновляет только nftables-наборы интерфейсов (НЕ хостлисты).

## Проверка работы

```bash
# Проверить запущенные процессы nfqws2
pgrep -a nfqws2

# Проверить таблицу nftables zapret2
nft list table inet zapret2

# Проверить доступ к заблокированному сайту
curl -m 5 -I https://blocked-site.com

# С подробностями
curl -v https://blocked-site.com 2>&1 | head -50
```

## Логирование

```bash
# Системные логи zapret2
logread | grep zapret2

# Логи nfqws2
logread | grep nfqws2

# В реальном времени
logread -f | grep -E "(zapret2|nfqws2)"

# Debug-логи nfqws2 (при включённом debug)
tail -f /tmp/zapret2/main.log

# Логи custom-скриптов
tail -f /tmp/zapret2/50-discord-media.log
```

**Примечание:** логи в `/tmp/zapret2/` создаются только при включённом Debug-режиме.

### Включение debug

```bash
uci set zapret2.main.debug='1'
uci commit zapret2
/etc/init.d/zapret2 restart
```

При включённом debug nfqws2 выводит информацию о каждом обработанном пакете, применённых стратегиях и отправленных fake-пакетах.

## Структура файлов `/opt/zapret2/`

```
/opt/zapret2/
├── blockcheck2.sh           # Утилита поиска стратегий
├── blockcheck2.d/           # Вспомогательные скрипты blockcheck2
├── common/                  # Общие скрипты
├── config                   # Конфигурация blockcheck2
├── files/
│   └── fake/                # Blobs (бинарные образцы)
├── init.d/
│   └── openwrt/
│       └── custom.d/        # Custom-скрипты
├── ipset/
│   ├── zapret_hosts_user.txt
│   ├── zapret_hosts_youtube.txt
│   ├── zapret_hosts_user_exclude.txt
│   └── zapret_hosts_auto.txt
├── lua/
│   ├── zapret-lib.lua       # Базовый (всегда загружен)
│   ├── zapret-antidpi.lua   # Базовый (всегда загружен)
│   ├── zapret-auto.lua      # Базовый (всегда загружен)
│   ├── zapret-obfs.lua      # Дополнительный
│   ├── zapret-pcap.lua      # Дополнительный
│   └── zapret-tests.lua     # Дополнительный
└── nfq2/
    └── nfqws2               # Бинарник (устанавливается под целевую архитектуру)

/etc/config/zapret2            # UCI конфигурация
/etc/init.d/zapret2            # Init-скрипт (procd)
```

## Lua скрипты

### Базовые (всегда загружены)

| Скрипт | Назначение |
|---|---|
| `zapret-lib.lua` | Библиотека: работа с пакетами, хостами, csum |
| `zapret-antidpi.lua` | Основные функции десинхронизации (fake, multisplit, multidisorder и др.) |
| `zapret-auto.lua` | Логика автовыбора стратегий (circular, autottl, autodetect) |

Базовые скрипты подключены на уровне init-скрипта и не могут быть отключены.

### Дополнительные (управляются через UCI)

| Скрипт | Назначение |
|---|---|
| `zapret-obfs.lua` | Обфускация трафика (WireGuard и др.) |
| `zapret-pcap.lua` | Захват пакетов в формате pcap |
| `zapret-tests.lua` | Тестирование Lua-интерфейса nfqws2 |

### Управление Lua скриптами

```bash
# Посмотреть доступные скрипты
uci show zapret2 | grep luascript

# Включить скрипт
uci set zapret2.lua_zapret_obfs.enabled='1'
uci commit zapret2
/etc/init.d/zapret2 restart

# Проверить что скрипт загружен
pgrep -a nfqws2 | grep lua-init
# Должен содержать: --lua-init=@/opt/zapret2/lua/zapret-obfs.lua
```

### Добавление своих Lua скриптов

1. Поместить `.lua` файл в `/opt/zapret2/lua/`
2. Добавить в UCI конфигурацию
3. Включить и перезапустить сервис

Порядок загрузки: сначала базовые скрипты, затем дополнительные.
