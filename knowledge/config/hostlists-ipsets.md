---
title: Hostlists and IPsets
zapret2-version: v0.9.4.5
tags: hostlist, ipset, filtering, domains, ip, include, exclude, gzip, auto-reload, sighup
source: deepwiki/bol-van/zapret2, official-docs
created: 2026-03-28
updated: 2026-04-15
---

# Хостлисты и IP-множества (IPsets)

Файловые механизмы фильтрации для избирательного применения стратегий обхода DPI. Каждый desync-профиль может ссылаться на несколько хостлистов и ipset-ов для включения (apply) и исключения (exclude).

## Хостлисты

### Формат файла

Один домен на строку. Поддерживаются plain text и gzip (`.gz`).

```
# Комментарий (также ; и / в начале строки)
example.com          # совпадает с example.com и *.example.com
^example.com         # строгое совпадение: ТОЛЬКО example.com, не субдомены
youtube.com
googlevideo.com
```

- Регистр не важен — все домены приводятся к lowercase при загрузке
- Пробелы и табы в конце строки обрезаются

### Логика поиска (matching)

**Обычная запись** (`example.com`):
- Рекурсивный поиск по субдоменам: `sub.example.com` → `example.com` → `com`
- Совпадает, если домен или любой родительский домен есть в списке

**Строгая запись** (`^example.com`):
- Помечается флагом `HOSTLIST_POOL_FLAG_STRICT_MATCH`
- Совпадает ТОЛЬКО при полном совпадении домена, без рекурсии по субдоменам

### CLI-параметры

```
--hostlist=/path/to/include.txt          # список включения
--hostlist-exclude=/path/to/exclude.txt  # список исключения
--hostlist-domains=a.com,b.com           # inline-домены (без файла)
--hostlist-auto=/path/to/auto.txt        # авто-хостлист (см. auto-hostlist.md)
```

## IPsets

### Формат файла

IP-адреса и CIDR-подсети, один на строку. IPv4 и IPv6. Поддерживается gzip.

```
# Комментарий
1.2.3.4
10.0.0.0/8
2001:db8::1
fd00::/32
```

### CLI-параметры

```
--ipset=/path/to/include-ips.txt          # список включения
--ipset-exclude=/path/to/exclude-ips.txt  # список исключения
```

### Внутреннее устройство

IPset хранит IPv4 и IPv6 пулы отдельно в radix/binary tree для эффективного поиска O(log n).

## Логика include/exclude

Порядок проверки детерминирован:

1. **Exclude проверяется первым** — если хост/IP в exclude-списке, пакет отклоняется
2. **Include проверяется вторым** — если include-коллекция пуста, пакет проходит (обратная совместимость)
3. Если include непуста — пакет должен совпасть хотя бы с одним include-списком

Эта логика одинакова для hostlists и ipsets.

## Gzip-поддержка

Прозрачная декомпрессия:
- Magic header `1F 8B` определяет gzip-файл
- `z_readfile()` декомпрессирует через `zlib` в буфер в памяти
- Декомпрессированный контент парсится построчно идентично plain text
- Полезно для больших списков (экономия места на роутерах)

## Авто-перезагрузка (hot reload)

Хостлисты и ipset-ы перезагружаются без перезапуска демона:

### Автоматическая детекция изменений
- `file_mod_signature()` проверяет mtime и размер файла через `stat()`
- Проверка происходит при обработке пакетов
- При изменении — файл перезагружается в память

### Ручная перезагрузка
```bash
# Отправить SIGHUP для немедленной перезагрузки всех списков
kill -HUP $(pidof nfqws2)
```

## Скрипты управления списками

Директория `ipset/` содержит утилиты для обновления списков из внешних источников:

| Скрипт | Назначение |
|--------|-----------|
| `def.sh` | Общие утилиты: `zzcat` (прозрачная gzip/plain декомпрессия), `digger` (DNS-резолвинг) |
| `get_reestr_preresolved.sh` | Загрузка пре-резолвленных IP-списков |
| `get_antifilter_ipsmart.sh` | Загрузка smart IP-списков |
| `hup_zapret_daemons()` | Отправка SIGHUP для немедленной перезагрузки |

## Типичные паттерны

### Разные списки для разных профилей

```
--name=youtube --filter-tcp=443 --filter-l7=tls
  --hostlist=/opt/zapret2/ipset/youtube.txt
  --lua-desync=fake:blob=fake_default_tls:tcp_md5
--new
--name=general --filter-tcp=443 --filter-l7=tls
  --hostlist=/opt/zapret2/ipset/general-blocked.txt
  --hostlist-exclude=/opt/zapret2/ipset/whitelist.txt
  --lua-desync=multisplit:pos=2
```

### Автообновление списков по cron

```bash
# /etc/cron.d/zapret-update
0 3 * * * root /opt/zapret2/ipset/get_antifilter_ipsmart.sh && kill -HUP $(pidof nfqws2)
```
