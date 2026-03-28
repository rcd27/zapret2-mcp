---
title: Strategy Orchestration
zapret2-version: v0.9.4.5
tags: circular-strategy, rotation, resilience, multi-strategy, profiles, autohostlist
source: official-docs
created: 2026-03-25
updated: 2026-03-29
---

# Оркестрация стратегий

## Circular Strategy (автоперебор)

Circular — автоматическая ротация между несколькими стратегиями. Если текущая стратегия перестаёт работать (N неудач за M секунд), nfqws2 переключается на следующую.

### Lua-формат

```
--lua-desync=circular:fails=2:maxtime=60
```

Параметры:
- `fails=N` — порог неудач для смены стратегии (по умолчанию 2)
- `maxtime=N` — временное окно в секундах (по умолчанию 60)
- `time=N` — альтернативное имя для `maxtime`
- `retrans=N` — количество ретрансмиссий до считывания неудачи
- `nld=N` — количество записей в NLD (network latency detection)

**Важно:** параметры circular должны быть без пробелов между стратегиями.

### Маркер `:final`

Последняя стратегия в circular-цепочке должна быть помечена `:final`:

```
--lua-desync=multisplit:pos=1,midsld:strategy=3:final
```

После достижения последней стратегии circular начинает цикл заново с strategy=1.

### Привязка стратегий к circular

Каждый `--lua-desync` может быть привязан к конкретной стратегии ротации через `strategy=N`:

```
--lua-desync=circular:fails=2:maxtime=60
--lua-desync=fake:blob=0x0F0F0F0F:tcp_seq=-10000:tcp_ack=-66000:badsum:strategy=1
--lua-desync=multisplit:pos=2,sld:seqovl=620:strategy=1
--lua-desync=fake:blob=0x00000000:tcp_ack=-66000:strategy=2
--lua-desync=multisplit:pos=2,endhost:strategy=2
--lua-desync=multisplit:pos=1:seqovl=681:ip_id=zero:strategy=3
```

Принцип: если стратегия 1 не работает (2 неудачи за 60 секунд), переключается на стратегию 2, и т.д.

### Полный пример circular

```
nfqws2 \
  --qnum=300 \
  --fwmark=0x40000000 \
  --filter-tcp=443 \
  --filter-l7=tls \
  --out-range=-s34228 \
  --in-range=-s5556 --lua-desync=circular:fails=2:maxtime=60 \
  --in-range=x \
  --payload=tls_client_hello \
  --lua-desync=fake:blob=0x0F0F0F0F:tcp_seq=-10000:tcp_ack=-66000:badsum:strategy=1 \
  --lua-desync=multisplit:pos=2,sld:seqovl=620:strategy=1 \
  --lua-desync=fake:blob=0x00000000:tcp_ack=-66000:strategy=2 \
  --lua-desync=multisplit:pos=2,endhost:strategy=2 \
  --lua-desync=multisplit:pos=1:seqovl=681:ip_id=zero:strategy=3
```

### Предустановленные circular-конфигурации

Пакет zapret2 включает предустановленные наборы:

| Стратегия | Статус | Circular | Назначение |
|---|---|---|---|
| **youtube** | Включена по умолчанию | 14 вариантов | Оптимизирована для YouTube, Google Video |
| **default** | Отключена | 8 вариантов | Универсальная для других сайтов |

Стратегия `youtube` работает со списком `zapret_hosts_youtube.txt`. Стратегия `default` может быть активирована для обхода блокировок других ресурсов и использует список `zapret_hosts_user.txt` с исключениями из `zapret_hosts_user_exclude.txt`.

### Range-параметры в circular

- `--out-range=-s34228` — обрабатывать исходящие пакеты до ~25 TCP-пакетов (по TCP sequence). Достаточно для полного TLS ClientHello включая большие (YouTube)
- `--in-range=-s5556` — обрабатывать входящие пакеты до ~5 TCP-пакетов. Используется circular для детекции сбоев (отсутствие Server Hello = неудача)
- `--in-range=x` — отключить обработку входящих для desync-действий (ставится после circular-директивы, чтобы desync-действия не реагировали на входящие пакеты)

### pktmod в circular

`pktmod` — специальное действие для модификации пакета без desync. Используется в паре с TTL-перебором:

```
--lua-desync=fake:blob=fake_default_tls:ip_ttl=3:repeats=1 --payload=empty --out-range=s1<d1 --lua-desync=pktmod:ip_ttl=1:strategy=2
```

Логика: fake отправляется с TTL=3 (умрёт после 3 хопов), затем `pktmod` уменьшает TTL реальных пакетов до 1 для out-range условия `s1<d1` (первый пакет после fake).

## Multi-profile конфигурация

nfqws2 поддерживает несколько профилей в одном запуске через `--new`:

```
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
```

Каждый профиль `--new` обрабатывает свой тип трафика:
- HTTP (порт 80)
- TLS (порт 443, TCP)
- QUIC (порт 443, UDP)

Порядок применения: стратегии проверяются **сверху вниз**. Первая подходящая (по порту, протоколу, фильтрам и хостлисту) используется для обработки пакета. Порядок можно менять.

## Autohostlist (автосписок)

Автоматическое определение заблокированных хостов по поведению соединений:

1. nfqws2 отслеживает неудачные соединения
2. Если хост не отвечает N раз за M секунд — добавляется в автосписок
3. К хостам из автосписка применяется десинхронизация

### Параметры autohostlist

| Параметр | По умолчанию | Описание |
|---|---|---|
| Enabled | 0 | Включить автоопределение |
| Fail threshold | 3 | Количество неудач для добавления |
| Fail time | 60 | Временное окно (секунды) |
| Retrans threshold | 3 | Порог ретрансмиссий |
| Debug | 0 | Логирование срабатываний |

### Настройка autohostlist

```bash
uci set zapret2.main.autohostlist_enabled='1'
uci set zapret2.main.autohostlist_fail_threshold='3'
uci set zapret2.main.autohostlist_fail_time='60'
uci commit zapret2
/etc/init.d/zapret2 restart
```

Лог автодобавлений: `/opt/zapret2/ipset/zapret_hosts_auto_debug.log`

Файл автосписка: `/opt/zapret2/ipset/zapret_hosts_auto.txt`

## Фильтры профилей

```
--filter-tcp=[~]port1[-port2]    # TCP порт (~ = инвертировать)
--filter-udp=[~]port1[-port2]    # UDP порт
--filter-l7=proto[,proto]        # L7 протокол: http, tls, quic, dns, и др.
--filter-l3=ipv4|ipv6            # IP версия
```

## Рекомендации

- Создавай отдельные профили для HTTP, TLS и QUIC — у них разная логика bypass
- Для resilience используй circular внутри каждого профиля
- `<HOSTLIST>` заменяется на путь к списку доменов при запуске
- `<HOSTLIST_NOAUTO>` — список без автодобавления (для QUIC, где autodetect ненадёжен)
