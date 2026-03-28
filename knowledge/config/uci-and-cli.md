---
title: UCI конфигурация и CLI-утилита zapret2
zapret2-version: v0.9.4.5
tags: uci, cli, config, openwrt, init, service, management
source: official-docs
created: 2026-03-28
updated: 2026-03-28
---

# UCI конфигурация и CLI-утилита zapret2

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
config luascript 'lua_zapret_wgobfs'
    option path '/opt/zapret2/lua/zapret-wgobfs.lua'
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

## CLI-утилита `zapret2`

```bash
zapret2 status      # Статус демона nfqws2
zapret2 genconfig   # Сгенерировать конфиг из UCI
zapret2 dump        # Показать загруженную конфигурацию
zapret2 reset       # Сбросить конфигурацию к дефолтам
zapret2 --help      # Справка
```

### Примеры вывода

```bash
$ zapret2 status
zapret2 is running
  Instances: 4
  First PID: 1234
  Strategies: 1 enabled

$ zapret2 dump
Main configuration:
  enabled: 1
  desync_mark: 0x40000000
  qnum: 300

Strategies:
  youtube (enabled):
    port: 443
    protocol: tcp
    filter_l7: tls
    hostlist: list_hosts_youtube
```

## Управление сервисом (init-скрипт)

```bash
/etc/init.d/zapret2 start      # Запустить
/etc/init.d/zapret2 stop       # Остановить
/etc/init.d/zapret2 restart    # Полный перезапуск демона
/etc/init.d/zapret2 reload     # Перезагрузить хостлисты (SIGHUP)
/etc/init.d/zapret2 status     # Показать статус
/etc/init.d/zapret2 enable     # Включить автозапуск
/etc/init.d/zapret2 disable    # Отключить автозапуск
```

### reload vs restart

- **reload** — отправляет SIGHUP демону nfqws2. Перезагружает **только хостлисты и ipset-ы** без остановки процесса. Активные соединения не прерываются.
- **restart** — полностью останавливает и запускает демон. Применяет **все изменения** включая стратегии. Активные соединения прерываются.

**Когда что использовать:**
- Изменили список доменов → `reload`
- Изменили стратегию или параметры → `restart`

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
tail -f /tmp/zapret2/50-discord_media.log
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
│   ├── zapret-wgobfs.lua    # Дополнительный
│   ├── zapret-pcap.lua      # Дополнительный
│   └── zapret-tests.lua     # Дополнительный
└── nfq2/
    ├── nfqws2.aarch64
    └── nfqws2.x86_64

/etc/config/zapret2            # UCI конфигурация
/etc/init.d/zapret2            # Init-скрипт
/usr/bin/zapret2               # CLI-утилита
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
| `zapret-obfs.lua` | Обфускация трафика |
| `zapret-wgobfs.lua` | Обфускация WireGuard |
| `zapret-pcap.lua` | Захват пакетов в формате pcap |
| `zapret-tests.lua` | Тестирование Lua-интерфейса nfqws2 |

### Управление Lua скриптами

```bash
# Посмотреть доступные скрипты
uci show zapret2 | grep luascript

# Включить скрипт
uci set zapret2.lua_zapret_wgobfs.enabled='1'
uci commit zapret2
/etc/init.d/zapret2 restart

# Проверить что скрипт загружен
pgrep -a nfqws2 | grep lua-init
# Должен содержать: --lua-init=@/opt/zapret2/lua/zapret-wgobfs.lua
```

### Добавление своих Lua скриптов

1. Поместить `.lua` файл в `/opt/zapret2/lua/`
2. Добавить в UCI конфигурацию
3. Включить и перезапустить сервис

Порядок загрузки: сначала базовые скрипты, затем дополнительные.
