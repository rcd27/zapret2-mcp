---
title: Fake Packet Strategies
zapret2-version: v0.9.4.5
tags: fake, rst, rstack, syndata, fooling, md5sig, badsum, autottl, ttl
source: official-docs
created: 2026-03-25
updated: 2026-03-25
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
- `tls_mod=<mods>` — модификации TLS: `rnd`, `rndsni`, `sni=<str>`, `dupsid`, `padencap`
- `repeats=<N>` — количество повторений fake-пакета

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
