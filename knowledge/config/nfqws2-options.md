---
title: nfqws2 Command-Line Options Reference
zapret2-version: v0.9.4.5
tags: nfqws2, cli, options, parameters, reference
---

# Справочник параметров nfqws2

## Системные параметры

```
--qnum=<number>                    # Номер NFQUEUE (Linux)
--debug=0|1|syslog|android|@file  # Управление отладочным выводом
--daemon                           # Запуск в режиме демона
--pidfile=<filename>               # Путь к PID-файлу
--uid=<user>                       # Запуск от имени пользователя (обычно nobody)
--intercept=0|1                    # Включить перехват трафика
```

## Lua-инициализация

```
--lua-init=@<file>|<code>          # Lua-скрипт инициализации
--lua-gc=<int>                     # Интервал сборки мусора (секунды)
```

Стандартные Lua-библиотеки:
- `zapret-lib.lua` — вспомогательные функции
- `zapret-antidpi.lua` — библиотека стратегий desync
- `zapret-auto.lua` — автоматическое определение стратегий

## Connection Tracking

```
--ctrack-timeouts=S:E:F:U          # Таймауты conntrack (SYN:EST:FIN:UDP)
--ctrack-disable                   # Отключить conntrack
```

## Фильтры профиля

```
--new[=name]                       # Новый профиль (multi-strategy)
--filter-l3=ipv4|ipv6             # Фильтр по IP-версии
--filter-tcp=[~]port1[-port2]     # TCP порт (~ = инвертировать)
--filter-udp=[~]port1[-port2]     # UDP порт
--filter-l7=proto[,proto]         # L7 протокол
--filter-icmp=type[:code]         # ICMP тип/код
```

## L7 протоколы

Поддерживаемые значения для `--filter-l7`:
- **TCP**: `http`, `tls`, `xmpp`, `mtproto`, `bt`
- **UDP**: `quic`, `dns`, `dtls`, `wireguard`, `discord`, `stun`, `utp_bt`, `dht`

## Типы payload

Для `--payload=`:
- `http_req`, `http_reply`
- `tls_client_hello`, `tls_server_hello`
- `quic_initial`
- `dns_query`, `dns_response`
- `empty` (пакеты нулевой длины)
- `unknown` (нераспознанные)

## Списки доменов и IP

```
--hostlist=<file>                  # Белый список доменов
--hostlist-exclude=<file>          # Чёрный список доменов
--hostlist-auto=<file>             # Автозаполняемый список (по детекции блокировки)
--ipset=<file>                     # Белый список IP
--ipset-exclude=<file>             # Чёрный список IP
```

## Binary данные (blob)

```
--blob=<name>:0xHEX|@<filename>   # Загрузка бинарных данных для стратегий
```

Предопределённые blob:
- `fake_default_http` — стандартный fake HTTP-запрос
- `fake_default_tls` — стандартный fake TLS ClientHello
- `fake_default_quic` — стандартный fake QUIC Initial

## Range-фильтры (connbytes)

```
--in-range=<range>                 # Диапазон входящих пакетов
--out-range=<range>                # Диапазон исходящих пакетов
```

Формат range: `[mode]<num>[-|<][mode]<num>`

Режимы:
- `n` = номер пакета
- `d` = номер data-пакета
- `b` = счётчик байт
- `s` = смещение TCP sequence
- `p` = TCP position
- `a` = всегда
- `x` = никогда

## Desync-параметры (legacy формат)

```
--dpi-desync=<strategy>            # Стратегия: split2, disorder2, fake, rst, и др.
--dpi-desync-split-pos=<pos>       # Позиция разбиения
--dpi-desync-split-seqovl=<N>      # TCP sequence overlap
--dpi-desync-fooling=<methods>     # Fooling: md5sig, badsum, ip_autottl, и др.
--dpi-desync-fake-tls=<file>       # Кастомный fake TLS payload
--dpi-desync-fake-http=<file>      # Кастомный fake HTTP payload
--dpi-desync-fake-quic=<file>      # Кастомный fake QUIC payload
--dpi-desync-circular-strategy=N   # Ротация стратегий
--dpi-desync-udplen-increment=N    # UDP padding
```

## Lua-desync формат (nfqws2 v0.9+)

Новый формат через `--lua-desync=`:
```
--lua-desync=<action>[:param1=val1[:param2=val2]]
```

Доступные action:
- `fake` — отправка fake-пакета
- `multisplit` — разбиение в нескольких позициях
- `multidisorder` — разбиение в обратном порядке
- `tcpseg` — TCP-сегментация
- `pktmod` — модификация пакета in-place
- `send` — дублирование пакета с модификациями
- `drop` — сброс пакета
- `http_hostcase` — изменение регистра Host:
- `http_domcase` — рандомизация регистра домена
- `wssize` — TCP window size manipulation
- `oob` — out-of-band data

Общие fooling-параметры (для всех action):
- `ip_ttl=<N>` — IP TTL
- `ip6_ttl=<N>` — IPv6 hop limit
- `tcp_seq=<offset>` — смещение TCP sequence
- `tcp_ack=<offset>` — смещение TCP ACK
- `tcp_md5[=hex]` — MD5 signature
- `badsum` — испорченная L4 checksum
- `ip_id=rnd` — случайный IP ID
