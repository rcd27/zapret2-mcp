---
title: Community Strategies — Production Examples
zapret2-version: v0.9.4.5
tags: community, strategies, circular, production, youtube, examples, multidisorder, multisplit, hostfakesplit
source: community
created: 2026-03-29
updated: 2026-03-29
---

# Community-стратегии (production-примеры)

**Важно:** "серебряной пули" не существует. Эффективность стратегий зависит от провайдера, региона и текущей конфигурации ТСПУ. Используйте `blockcheckw scan` + `blockcheckw check` для поиска рабочей стратегии на вашем подключении.

Приведённые примеры — обезличенные стратегии, зарекомендовавшие себя у множества пользователей на разных провайдерах. Актуальность: март 2026.

## Шаблон circular-стратегии

Большинство production-стратегий используют единый шаблон:

```
--out-range=-s34228
--payload=tls_client_hello
--in-range=-s5556 --lua-desync=circular:fails=3:maxtime=60
--in-range=x
--lua-desync=<action>:strategy=1
--lua-desync=<action>:strategy=2
...
--lua-desync=<action>:strategy=N:final
```

Разбор:
- `--out-range=-s34228` — обрабатывать исходящие пакеты в пределах ~25 TCP-пакетов
- `--in-range=-s5556` — обрабатывать входящие до ~5 TCP-пакетов (для circular-детекции сбоев)
- `--lua-desync=circular:fails=3:maxtime=60` — переключение стратегии после 3 неудач или 60 секунд
- `--in-range=x` — отключить обработку входящих для desync-действий (только для circular-мониторинга)
- `:final` — маркер последней стратегии в цепочке circular

## Стратегия: multidisorder + fake (широкая совместимость)

Работает на многих провайдерах. Два варианта в circular-ротации:

```
--out-range=-s34228
--payload=tls_client_hello
--in-range=-s5556 --lua-desync=circular:fails=3:maxtime=60
--in-range=x
--lua-desync=multidisorder:pos=1,sniext+1,host+1,midsld-2,midsld,midsld+2,endhost-1:strategy=1
--lua-desync=fake:blob=fake_default_tls:badsum:tls_mod=sni=rzd.ru:repeat=8:strategy=1
--lua-desync=multidisorder:pos=1,sniext+1,host+1,midsld-2,midsld,midsld+2,endhost-1:strategy=2
--lua-desync=fake:blob=blob_tls_clienthello_www_google_com:optional:tcp_seq=-10000:tcp_ack=-66000:badsum:tls_mod=rnd,dupsid,sni=rzd.ru:repeat=4:strategy=2:final
```

Как работает:
1. **multidisorder** разбивает ClientHello на 7 точек (SNI extension, hostname, середина SLD, конец hostname) — делает SNI непарсабельным для DPI
2. **fake** отправляет поддельный ClientHello с подменённым SNI, битой checksum и смещёнными TCP sequence/ack — DPI "залипает" на фейке, сервер отбрасывает

## Стратегия: простая fake + multisplit

Минимальная стратегия для провайдеров с менее агрессивным DPI:

```
--out-range=-s34228
--payload=tls_client_hello
--in-range=-s5556 --lua-desync=circular:fails=3:maxtime=90
--in-range=x
--lua-desync=fake:blob=fake_default_tls:tcp_seq=1000000:repeats=1:strategy=1
--lua-desync=multisplit:pos=2:strategy=1
--lua-desync=fake:blob=fake_default_tls:tcp_seq=1000000:repeats=1:strategy=2
--lua-desync=multisplit:pos=midsld:strategy=2
--lua-desync=fake:blob=fake_default_tls:badsum:repeats=1:strategy=3
--lua-desync=hostfakesplit:badsum:repeats=1:strategy=3
--lua-desync=fake:blob=fake_default_tls:tcp_flags_unset=ACK:repeats=1:strategy=4
--lua-desync=hostfakesplit:disorder_after:tcp_flags_unset=ACK:repeats=1:strategy=4
--lua-desync=fake:blob=fake_default_tls:tcp_flags_set=SYN:repeats=1:strategy=5
--lua-desync=hostfakesplit:midhost=midsld:tcp_flags_set=SYN:repeats=1:strategy=5:final
```

5 стратегий в ротации, каждая использует разные методы fooling: tcp_seq offset, badsum, tcp_flags.

## Стратегия: расширенная с TTL-перебором

Для провайдеров, где DPI чувствителен к TTL:

```
--out-range=-s34228
--payload=tls_client_hello
--in-range=-s5556 --lua-desync=circular:fails=3:maxtime=60
--in-range=x
--lua-desync=fake:blob=fake_default_tls:ip_ttl=2:repeats=1 --payload=empty --out-range=s1<d1 --lua-desync=pktmod:ip_ttl=1:strategy=1
--lua-desync=fake:blob=fake_default_tls:ip_ttl=3:repeats=1 --payload=empty --out-range=s1<d1 --lua-desync=pktmod:ip_ttl=1:strategy=2
...
--lua-desync=fake:blob=fake_default_tls:ip_ttl=8:repeats=1 --payload=empty --out-range=s1<d1 --lua-desync=pktmod:ip_ttl=1:strategy=7
--lua-desync=fake:blob=fake_default_tls:badsum:repeats=1:strategy=8
--lua-desync=fake:blob=fake_default_tls:tcp_ts=-1000:repeats=1:strategy=9:final
```

Circular перебирает TTL от 2 до 8, затем fallback на badsum и tcp_ts. Используется `pktmod:ip_ttl=1` для уменьшения TTL реальных пакетов после отправки fake.

## Стратегия: простая без circular (лёгкий DPI)

Для провайдеров с простым DPI, где достаточно TCP segmentation:

```
--payload=tls_client_hello
--lua-desync=tcpseg:pos=0,midsld:ip_id=rnd:repeats=1
```

Минимальный overhead, работает на провайдерах, где DPI не умеет собирать TCP-фрагменты.

## Стратегия: fake + multidisorder без circular

Простой двухступенчатый bypass без circular-ротации:

```
--payload=tls_client_hello
--lua-desync=fake:blob=blob_tls_clienthello_escapefromtarkov_com:badsum:tcp_ts=-600000:repeats=6
--lua-desync=multidisorder:pos=1,sniext+1,host+1,midsld-2,midsld,midsld+2,endhost-1
```

1. 6 fake ClientHello с битой checksum и сильно сдвинутым timestamp
2. Настоящий ClientHello разбивается multidisorder на 7 позиций

## Рекомендации по выбору

1. **Начни с простой** (`tcpseg` без circular) — если работает, не усложняй
2. **Если простая не работает** — попробуй multidisorder + fake (широкая совместимость)
3. **Если ломается через время** — добавь circular с 3+ стратегиями
4. **YouTube требует особого подхода** — используй стратегии с out-range=-s34228 для обработки больших ClientHello
5. **Используй `blockcheckw scan` + `check`** — автоматический подбор всегда лучше ручного
