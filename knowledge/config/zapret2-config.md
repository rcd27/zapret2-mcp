---
title: zapret2 Configuration File Reference
zapret2-version: v0.9.4.5
tags: config, configuration, parameters, setup
source: official-docs
created: 2026-03-25
updated: 2026-03-25
---

# Конфигурационный файл zapret2

Расположение: `/opt/zapret2/config`
Шаблон: `/opt/zapret2/config.default`

## Основные параметры

### Включение/выключение
```bash
NFQWS2_ENABLE=1                    # Включить nfqws2 (0 = выключен)
```

### Порты
```bash
NFQWS2_PORTS_TCP=80,443            # TCP-порты для перехвата
NFQWS2_PORTS_UDP=443               # UDP-порты для перехвата
```

### Лимиты пакетов (connbytes)
```bash
NFQWS2_TCP_PKT_OUT=20             # Макс исходящих TCP-пакетов
NFQWS2_TCP_PKT_IN=10              # Макс входящих TCP-пакетов
NFQWS2_UDP_PKT_OUT=5              # Макс исходящих UDP-пакетов
NFQWS2_UDP_PKT_IN=3               # Макс входящих UDP-пакетов
```

### Стратегия bypass
```bash
NFQWS2_OPT="..."                   # Основные параметры nfqws2
```

Это главный параметр — содержит стратегии desync. Может быть multi-profile через `--new`.

### Метка desync
```bash
DESYNC_MARK=0x40000000             # NFT mark для предотвращения петель
```

### Фильтрация
```bash
MODE_FILTER=none|ipset|hostlist|autohostlist
```

### IPv6
```bash
DISABLE_IPV6=1                     # Отключить IPv6 (по умолчанию включён)
```

### Прочее
```bash
SET_MAXELEM=522288                 # Макс элементов ipset
MDIG_THREADS=30                    # Потоки параллельного DNS-резолвинга
```

## Пример полной конфигурации

```bash
NFQWS2_ENABLE=1
NFQWS2_PORTS_TCP=80,443
NFQWS2_PORTS_UDP=443

NFQWS2_OPT="
--filter-tcp=80 --filter-l7=http <HOSTLIST>
  --payload=http_req
  --lua-desync=fake:blob=fake_default_http:tcp_md5
  --lua-desync=multisplit:pos=method+2
--new
--filter-tcp=443 --filter-l7=tls <HOSTLIST>
  --payload=tls_client_hello
  --lua-desync=fake:blob=fake_default_tls:tcp_md5:tcp_seq=-10000
  --lua-desync=multidisorder:pos=1,midsld
--new
--filter-udp=443 --filter-l7=quic <HOSTLIST_NOAUTO>
  --payload=quic_initial
  --lua-desync=fake:blob=fake_default_quic:repeats=6
"

DESYNC_MARK=0x40000000
MODE_FILTER=none
DISABLE_IPV6=0
```

## Файловая структура zapret2

| Путь | Назначение |
|------|-----------|
| `/opt/zapret2/config` | Основной конфиг |
| `/opt/zapret2/config.default` | Шаблон конфига |
| `/opt/zapret2/nfq2/nfqws2` | Бинарник демона |
| `/opt/zapret2/lua/zapret-lib.lua` | Lua-библиотека |
| `/opt/zapret2/lua/zapret-antidpi.lua` | Стратегии desync |
| `/opt/zapret2/lua/zapret-auto.lua` | Авто-определение |
| `/opt/zapret2/ipset/` | Списки IP/доменов |
| `/opt/zapret2/init.d/` | Init-скрипты |
| `/opt/zapret2/blockcheck2.sh` | Диагностика (legacy) |
