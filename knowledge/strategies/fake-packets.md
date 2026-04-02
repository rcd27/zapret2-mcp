---
title: Fake Packet Strategies
zapret2-version: v0.9.4.5
tags: fake, rst, rstack, syndata, fooling, md5sig, badsum, autottl, ttl, ip6, extension headers, tcp_ts_up, tcp_nop_del, ip_id, ipfrag2, synhide, hex-pattern, syn_packet
source: deepwiki/bol-van/zapret2, official-docs, community
created: 2026-03-25
updated: 2026-04-02
revision: 4
---

# Fake Packets (инъекция пакетов-обманок)

Стратегии, которые отправляют поддельные пакеты. DPI обрабатывает fake и пропускает настоящие данные, а сервер
отбрасывает fake.

## Стратегии

### fake

Отправляет fake-пакет перед реальным. DPI обрабатывает fake и «теряет» реальные данные.

### rst

Отправляет fake RST, чтобы DPI считал соединение закрытым и прекратил инспекцию.

Параметр `rstack` — отправить RST+ACK вместо RST:

```
--lua-desync=rst:rstack
```

### syndata

Отправляет данные в SYN-пакете (нестандартное поведение). Сбивает некоторые DPI, которые не ожидают payload в SYN и
теряют контекст отслеживания соединения.

Community-практика — комбинировать syndata с multisplit для googlevideo.com CDN:

```
--lua-desync=syndata:blob=fake_default_tls
--lua-desync=multisplit:pos=1,sld+1,endsld-2:seqovl=1
```

### fakeddisorder

Комбинация fake + disorder в одном действии. Отправляет fake-пакет и переупорядочивает сегменты:

```
--lua-desync=fakeddisorder:pos=method+2:tcp_md5
--lua-desync=fakeddisorder:pos=10,midsld:seqovl=336:seqovl_pattern=fake_default_tls:badsum
```

### tls_client_hello_clone

Клонирует реальный TLS ClientHello в blob для использования как fake. Создаёт максимально правдоподобный fake, т.к. он
основан на реальном пакете:

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

В nfqws2 fake-пакеты задаются через blob-систему в lua-desync:

```
--lua-desync=fake:blob=fake_default_tls:tcp_md5
--lua-desync=fake:blob=fake_default_http:tcp_md5:tcp_seq=-10000
```

Стандартные blob'ы: `fake_default_tls` (Firefox ClientHello, SNI=www.microsoft.com), `fake_default_http` (GET www.iana.org), `fake_default_quic` (0x40 + 619×0x00). Кастомные blob'ы загружаются из файлов: `name:@path/to/file.bin`.

### Inline hex-паттерны вместо blob-файлов

Вместо загрузки .bin файла можно указать hex-паттерн прямо в командной строке. Компактнее и не зависит от наличия файлов
на диске:

```
--lua-desync=fake:blob=0x0F0F0F0F:badsum:repeats=4
--lua-desync=fake:blob=0x0F0F0E0F:tls_mod=rnd,dupsid:tcp_md5
--lua-desync=fake:blob=0x00000000:badsum:repeats=11
```

Community-практика: hex-паттерны `0x0F0F0F0F` и `0x0F0F0E0F` часто используются как compact fake. Паттерн `0x00000000` —
нулевые байты, минимальный fake для brute-force подхода с высоким repeats.

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

### tcp_md5

```
--lua-desync=fake:blob=fake_default_tls:tcp_md5
```

Добавляет фальшивую TCP MD5 signature (Option 19). По умолчанию — 16 случайных байт. Сервер на Linux отбрасывает пакеты с неверной MD5. **Самый надёжный метод** для Linux-серверов.

### badsum

```
--lua-desync=fake:blob=fake_default_tls:badsum
```

Портит TCP checksum. NIC сервера отбрасывает пакеты с плохой checksum. **НЕ работает**, если у сервера отключён checksum
offload.

### ip_autottl

```
--lua-desync=fake:blob=fake_default_tls:ip_autottl
```

Автоматически подбирает TTL так, чтобы fake «умер» до сервера, но прошёл через DPI. Формат: `ip_autottl=delta,min-max`. **Лучший TTL-метод** — адаптивный.

### ip_ttl=N

```
--lua-desync=fake:blob=fake_default_tls:ip_ttl=3
```

Фиксированный TTL для fakes. **Хрупкий** — зависит от количества хопов до DPI и сервера. Может сломаться при смене
маршрута.

### tcp_ts

Сдвигает TCP timestamp. Сервер отбрасывает устаревшие timestamps.

### Комбинации

Можно комбинировать несколько методов в одном инстансе:

```
--lua-desync=fake:blob=fake_default_tls:tcp_md5:badsum
```

## Расширенные fooling-параметры (Lua)

В Lua-режиме (`--lua-desync`) доступны дополнительные параметры модификации пакетов.

### IP Layer

| Параметр                   | Описание                                                                                                                                                                                                               |
|----------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `ip_ttl=N`                 | Установить IPv4 TTL в значение N                                                                                                                                                                                       |
| `ip6_ttl=N`                | Установить IPv6 hop limit в значение N                                                                                                                                                                                 |
| `ip_autottl=delta,min-max` | Адаптивный TTL: оценка расстояния по входящим TTL (базы 64, 128, 255), применение delta с ограничениями min-max                                                                                                        |
| `ip_id=seq\|rnd\|zero`     | Управление IPv4 Identification: `seq` — инкрементальный, `rnd` — случайный, `zero` — нулевой. `zero` обманывает DPI, которые используют IP ID для трекинга потока. Опция `ip_id_conn` привязывает счётчик к соединению |

### IPv6 Extension Headers

Вставка нестандартных заголовков для сбивания stateful DPI:

| Параметр       | Заголовок             |
|----------------|-----------------------|
| `ip6_hopbyhop` | Hop-by-Hop Options    |
| `ip6_destopt`  | Destination Options   |
| `ip6_routing`  | Routing Header        |
| `ip6_ah`       | Authentication Header |

Система автоматически вызывает `fix_ip6_next()` для корректной цепочки заголовков.

### TCP Layer

| Параметр                      | Описание                                                                                                                                                                                                                 |
|-------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `tcp_seq=delta`               | Сдвиг TCP sequence number (wraparound-safe). Community-значения: `1000000` (стандарт), `10000000` (гарантированно вне TCP window), `0` (выглядит валидным для DPI, но отбрасывается сервером по другим fooling-причинам) |
| `tcp_ack=delta`               | Сдвиг TCP acknowledgment number. Типичное значение: `-66000`                                                                                                                                                             |
| `tcp_flags_set=SYN,ACK,...`   | Установить TCP-флаги                                                                                                                                                                                                     |
| `tcp_flags_unset=FIN,RST,...` | Сбросить TCP-флаги                                                                                                                                                                                                       |
| `tcp_ts=delta`                | Модификация TCP Timestamp option                                                                                                                                                                                         |
| `tcp_ts_up`                   | Переместить Timestamp option в начало списка опций (обходит DPI, которые проверяют timestamp только если он первый)                                                                                                      |
| `tcp_nop_del`                 | Удалить NOP-padding (0x01) из TCP options, освобождая место в 40-байтном пространстве                                                                                                                                    |
| `tcp_md5[=hexdata]`           | Добавить TCP MD5 Signature (Option 19). По умолчанию — 16 случайных байт                                                                                                                                                   |

### Checksum и фрагментация

| Параметр          | Описание                                                                                                                               |
|-------------------|----------------------------------------------------------------------------------------------------------------------------------------|
| `badsum`          | Намеренно портит L4 checksum — DPI обрабатывает пакет, стек получателя отбрасывает                                                     |
| `ipfrag2`         | Разбивает пакет на 2 IP-фрагмента. TCP: offset 32 байта, UDP: 8 байт. Точка разбиения выравнивается на 8 (требование IP fragmentation) |
| `ipfrag_disorder` | Отправить второй фрагмент раньше первого для максимального сбоя DPI                                                                    |

## Когда использовать

- **fake + tcp_md5** — основная комбинация. Работает против большинства stateful DPI.
- **fake + badsum** — альтернатива tcp_md5. Не всегда работает.
- **fake + ip_autottl** — если tcp_md5/badsum не помогают. Адаптивный TTL.
- **Избегать ip_ttl=N** — хрупкий, ломается при смене маршрутизации.
- **rst** (с `rstack` при необходимости) — для DPI, который отслеживает состояние TCP-сессий.

## Типичная ошибка

Если fakes доходят до сервера (неправильный fooling), соединение ломается:

- Симптомы: connection reset, TLS handshake failure
- Решение: сменить fooling метод (tcp_md5 → badsum → ip_autottl)
