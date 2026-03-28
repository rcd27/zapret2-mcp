---
title: Fake Packet Strategies
zapret2-version: v0.9.4.5
tags: fake, rst, rstack, syndata, fooling, md5sig, badsum, autottl, ttl, ip6, extension headers, tcp_ts_up, tcp_nop_del, ip_id, ipfrag2, synhide
source: deepwiki/bol-van/zapret2, official-docs
created: 2026-03-25
updated: 2026-03-29
revision: 3
---

# Fake Packets (инъекция пакетов-обманок)

Стратегии, которые отправляют поддельные пакеты. DPI обрабатывает fake и пропускает настоящие данные, а сервер отбрасывает fake.

## Стратегии

### fake
Отправляет fake-пакет перед реальным. DPI обрабатывает fake и «теряет» реальные данные.

### rst / rstack
Отправляет fake RST, чтобы DPI считал соединение закрытым и прекратил инспекцию.

### syndata
Отправляет данные в SYN-пакете (нестандартное поведение). Сбивает некоторые DPI.

### fakeddisorder
Комбинация fake + disorder в одном действии. Отправляет fake-пакет и переупорядочивает сегменты:
```
--lua-desync=fakeddisorder:pos=method+2:tcp_md5
--lua-desync=fakeddisorder:pos=10,midsld:seqovl=336:seqovl_pattern=blob_tls_clienthello_www_google_com:badsum
```

### tls_client_hello_clone
Клонирует реальный TLS ClientHello в blob для использования как fake. Создаёт максимально правдоподобный fake, т.к. он основан на реальном пакете:
```
--lua-desync=tls_client_hello_clone:blob=cloned_tls:fallback=fake_default_tls
--lua-desync=fake:blob=cloned_tls:optional:tcp_seq=10000000:tls_mod=rnd,dupsid,sni=fonts.google.com
```
Параметры:
- `blob=<name>` — имя для сохранения клона
- `fallback=<blob>` — fallback blob, если клонирование не удалось

### hostfakesplit
Split с fake на уровне hostname. Позволяет указать конкретный хост для fake-части:
```
--lua-desync=hostfakesplit:host=ozon.ru:midhost=host-2:seqovl=sniext+3:seqovl_pattern=tls_clienthello:badsum:tcp_md5:tcp_ts_up
--lua-desync=hostfakesplit:host=google.com:tcp_ts=-600000
```
Параметры:
- `host=<domain>` — домен для fake-части
- `midhost=<pos>` — позиция разделения внутри hostname (`midsld`, `host-2` и т.д.)
- `altorder=1` — альтернативный порядок отправки сегментов
- `disorder_after` — переупорядочить после split

### pktmod
Модификация пакета без отправки fake. Используется для изменения параметров реальных пакетов:
```
--lua-desync=pktmod:ip_ttl=1
```
Часто используется в паре с fake в circular-стратегиях для TTL-перебора.

## Параметры fake-пакетов

```
--dpi-desync-fake-tls=<file>    # кастомный fake TLS ClientHello
--dpi-desync-fake-http=<file>   # кастомный fake HTTP-запрос
```

Lua-формат:
```
--lua-desync=fake:blob=fake_default_tls:tcp_md5
--lua-desync=fake:blob=fake_default_http:tcp_md5:tcp_seq=-10000
```

Параметры fake в Lua:
- `blob=<payload>` — binary payload для fake
- `tcp_md5` — добавить MD5 signature (fooling)
- `tcp_seq=<offset>` — смещение TCP sequence
- `tls_mod=<mods>` — модификации TLS: `rnd`, `rndsni`, `sni=<str>`, `dupsid`, `padencap`, `none`
- `repeats=<N>` — количество повторений fake-пакета
- `tcp_ack=<delta>` — сдвиг TCP acknowledgment number (например `-66000`)
- `optional` — не считать ошибкой, если blob не найден
- `nodrop` — не дропать оригинальный пакет (для multisplit с blob)

## Fooling (маскировка fakes)

Fake-пакеты ОБЯЗАНЫ быть отброшены сервером, но обработаны DPI. Fooling обеспечивает это.

### md5sig
```
--dpi-desync-fooling=md5sig
```
Добавляет фальшивую TCP MD5 signature. Сервер на Linux отбрасывает пакеты с неверной MD5. **Самый надёжный метод** для Linux-серверов.

### badsum
```
--dpi-desync-fooling=badsum
```
Портит TCP checksum. NIC сервера отбрасывает пакеты с плохой checksum. **НЕ работает**, если у сервера отключён checksum offload.

### ip_autottl
```
--dpi-desync-fooling=ip_autottl
```
Автоматически подбирает TTL так, чтобы fake «умер» до сервера, но прошёл через DPI. **Лучший TTL-метод** — адаптивный.

### ip_ttl=N
```
--dpi-desync-fooling=ip_ttl=N
```
Фиксированный TTL для fakes. **Хрупкий** — зависит от количества хопов до DPI и сервера. Может сломаться при смене маршрута.

### tcp_ts
```
--dpi-desync-fooling=tcp_ts
```
Сдвигает TCP timestamp далеко в прошлое. Сервер отбрасывает устаревшие timestamps.

### Комбинации
Можно комбинировать несколько методов:
```
--dpi-desync-fooling=md5sig,badsum
```

## Расширенные fooling-параметры (Lua)

В Lua-режиме (`--lua-desync`) доступны дополнительные параметры модификации пакетов.

### IP Layer

| Параметр | Описание |
|----------|----------|
| `ip_ttl=N` | Установить IPv4 TTL в значение N |
| `ip6_ttl=N` | Установить IPv6 hop limit в значение N |
| `ip_autottl=delta,min-max` | Адаптивный TTL: оценка расстояния по входящим TTL (базы 64, 128, 255), применение delta с ограничениями min-max |
| `ip_id=seq\|rnd\|zero` | Управление IPv4 Identification: `seq` — инкрементальный, `rnd` — случайный, `zero` — нулевой. Опция `ip_id_conn` привязывает счётчик к соединению |

### IPv6 Extension Headers

Вставка нестандартных заголовков для сбивания stateful DPI:

| Параметр | Заголовок |
|----------|----------|
| `ip6_hopbyhop` | Hop-by-Hop Options |
| `ip6_destopt` | Destination Options |
| `ip6_routing` | Routing Header |
| `ip6_ah` | Authentication Header |

Система автоматически вызывает `fix_ip6_next()` для корректной цепочки заголовков.

### TCP Layer

| Параметр | Описание |
|----------|----------|
| `tcp_seq=delta` | Сдвиг TCP sequence number (wraparound-safe) |
| `tcp_ack=delta` | Сдвиг TCP acknowledgment number |
| `tcp_flags_set=SYN,ACK,...` | Установить TCP-флаги |
| `tcp_flags_unset=FIN,RST,...` | Сбросить TCP-флаги |
| `tcp_ts=delta` | Модификация TCP Timestamp option |
| `tcp_ts_up` | Переместить Timestamp option в начало списка опций (обходит DPI, которые проверяют timestamp только если он первый) |
| `tcp_nop_del` | Удалить NOP-padding (0x01) из TCP options, освобождая место в 40-байтном пространстве |
| `tcp_md5[=hexdata]` | Добавить TCP MD5 Signature (Option 19). По умолчанию — 16 нулевых байт |

### Checksum и фрагментация

| Параметр | Описание |
|----------|----------|
| `badsum` | Намеренно портит L4 checksum — DPI обрабатывает пакет, стек получателя отбрасывает |
| `ipfrag2` | Разбивает пакет на 2 IP-фрагмента. TCP: offset 32 байта, UDP: 8 байт. Точка разбиения выравнивается на 8 (требование IP fragmentation) |
| `ipfrag_disorder` | Отправить второй фрагмент раньше первого для максимального сбоя DPI |

## Когда использовать

- **fake + md5sig** — основная комбинация. Работает против большинства stateful DPI.
- **fake + badsum** — альтернатива md5sig. Не всегда работает.
- **fake + ip_autottl** — если md5sig/badsum не помогают. Адаптивный TTL.
- **Избегать ip_ttl=N** — хрупкий, ломается при смене маршрутизации.
- **rst/rstack** — для DPI, который отслеживает состояние TCP-сессий.

## Типичная ошибка

Если fakes доходят до сервера (неправильный fooling), соединение ломается:
- Симптомы: connection reset, TLS handshake failure
- Решение: сменить fooling метод (md5sig → badsum → ip_autottl)
