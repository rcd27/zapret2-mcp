---
title: nfqws2 Command-Line Options Reference
zapret2-version: v0.9.4.5
tags: nfqws2, cli, options, parameters, reference
source: official-docs
created: 2026-03-25
updated: 2026-04-01
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
- `zapret-lib.lua` — вспомогательные функции, базовые fooling-операции
- `zapret-antidpi.lua` — библиотека стратегий desync
- `zapret-auto.lua` — автоматическое определение стратегий
- `zapret-obfs.lua` — обфускация протоколов
- `zapret-pcap.lua` — утилита PCAP-захвата

## Connection Tracking

```
--ctrack-timeouts=S:E:F[:U]        # Таймауты conntrack (SYN:EST:FIN[:UDP]), UDP опционален
--ctrack-disable=[0|1]             # Отключить conntrack (1 или без аргумента = отключить)
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

Для `--payload=` (полный список из исходного кода):

Специальные: `all`, `known`, `unknown`, `empty`

| Протокол | Payload types |
|---|---|
| HTTP | `http_req`, `http_reply` |
| TLS | `tls_client_hello`, `tls_server_hello` |
| DTLS | `dtls_client_hello`, `dtls_server_hello` |
| QUIC | `quic_initial` |
| DNS | `dns_query`, `dns_response` |
| WireGuard | `wireguard_initiation`, `wireguard_response`, `wireguard_cookie`, `wireguard_keepalive`, `wireguard_data` |
| XMPP | `xmpp_stream`, `xmpp_starttls`, `xmpp_proceed`, `xmpp_features` |
| Telegram | `mtproto_initial` |
| BitTorrent | `bt_handshake`, `utp_bt_handshake` |
| P2P/Other | `dht`, `discord_ip_discovery`, `stun` |
| IP/ICMP | `ipv4`, `ipv6`, `icmp` |

## Списки доменов и IP

```
--hostlist=<file>                  # Белый список доменов
--hostlist-domains=a.com,b.com     # Inline-список доменов (без файла)
--hostlist-exclude=<file>          # Чёрный список доменов
--hostlist-auto=<file>             # Автозаполняемый список (по детекции блокировки)
--ipset=<file>                     # Белый список IP
--ipset-exclude=<file>             # Чёрный список IP
```

## Binary данные (blob)

```
--blob=<name>:[+ofs]@<filename>|0xHEX  # Загрузка бинарных данных (+ofs = смещение в файле)
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

## Desync-параметры

> Параметры `--dpi-desync-*` (legacy) существуют только в nfqws **v1**. В nfqws2 все desync-стратегии задаются через `--lua-desync`.

### Lua-desync формат

```
--lua-desync=<action>[:param1=val1[:param2=val2]]
```

Доступные action (из `zapret-antidpi.lua`):

| Action | Описание |
|---|---|
| `fake` | Отправка fake-пакета |
| `rst` | Fake RST-пакет |
| `multisplit` | Разбиение в нескольких позициях |
| `multidisorder` | Разбиение в обратном порядке |
| `fakedsplit` | Разбиение с вставкой fake между частями |
| `fakeddisorder` | fakedsplit в обратном порядке |
| `hostfakesplit` | Fake-разбиение по hostname (HTTP + TLS) |
| `tcpseg` | TCP-сегментация |
| `oob` | Out-of-band data |
| `udplen` | Модификация длины UDP |
| `syndata` | SYN с данными |
| `http_hostcase` | Изменение регистра Host: → host: |
| `http_domcase` | Чередование регистра домена |
| `http_methodeol` | Вставка \r\n перед HTTP-методом |
| `wssize` | TCP window size на всех пакетах |
| `wsize` | TCP window size на SYN-ACK |
| `pktmod` | Модификация пакета in-place |
| `send` | Дублирование пакета с модификациями |
| `drop` | Сброс пакета |

Вспомогательные (из `zapret-lib.lua`): `pass`, `pktdebug`, `argdebug`, `posdebug`, `luaexec`

### Общие fooling-параметры (для action)

| Параметр | Описание |
|---|---|
| `ip_ttl=<N>` | IPv4 TTL |
| `ip_autottl=delta,min-max` | Автоопределение TTL до DPI |
| `ip6_ttl=<N>` | IPv6 hop limit |
| `ip6_autottl=delta,min-max` | Автоопределение IPv6 TTL |
| `tcp_seq=<offset>` | Смещение TCP sequence |
| `tcp_ack=<offset>` | Смещение TCP ACK |
| `tcp_md5[=hex]` | MD5 signature (TCP option) |
| `tcp_ts=<N>` | Смещение TCP timestamp |
| `tcp_ts_up` | Переместить timestamp option наверх |
| `tcp_flags_set=<list>` | Установить TCP-флаги |
| `tcp_flags_unset=<list>` | Снять TCP-флаги |
| `tcp_nop_del` | Удалить NOP TCP options |
| `badsum` | Испорченная L4 checksum |
| `ip_id=seq\|rnd\|zero\|none` | Политика IP ID |
| `ip6_hopbyhop[=hex]` | IPv6 hop-by-hop extension header |
| `ip6_hopbyhop2[=hex]` | Второй hop-by-hop header |
| `ip6_destopt[=hex]` | IPv6 destination options |
| `ip6_destopt2[=hex]` | Второй destopt header |
| `ip6_routing[=hex]` | IPv6 routing header |
| `ip6_ah[=hex]` | IPv6 authentication header |
| `fool=<func>` | Пользовательская функция fooling |
