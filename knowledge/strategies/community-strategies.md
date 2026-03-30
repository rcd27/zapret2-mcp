---
title: Community Strategies — Production Examples
zapret2-version: v0.9.4.5
tags: community, strategies, circular, production, youtube, examples, multidisorder, multisplit, hostfakesplit, syndata, hostfakesplit, seqovl-pattern, googlevideo, three-stream
source: community
created: 2026-03-29
updated: 2026-03-30
---

# Community-стратегии (production-примеры)

**Важно:** "серебряной пули" не существует. Эффективность стратегий зависит от провайдера, региона и текущей
конфигурации ТСПУ. Используйте `blockcheckw scan` + `blockcheckw check` для поиска рабочей стратегии на вашем
подключении.

Приведённые примеры — обезличенные стратегии, зарекомендовавшие себя у множества пользователей на разных провайдерах.
Актуальность: март 2026.

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

1. **multidisorder** разбивает ClientHello на 7 точек (SNI extension, hostname, середина SLD, конец hostname) — делает
   SNI непарсабельным для DPI
2. **fake** отправляет поддельный ClientHello с подменённым SNI, битой checksum и смещёнными TCP sequence/ack — DPI "
   залипает" на фейке, сервер отбрасывает

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

Circular перебирает TTL от 2 до 8, затем fallback на badsum и tcp_ts. Используется `pktmod:ip_ttl=1` для уменьшения TTL
реальных пакетов после отправки fake.

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

## Трёхпотоковая модель YouTube

Community-практика: YouTube требует **трёх отдельных стратегий**, т.к. DPI обрабатывает каждый тип трафика по-разному:

| Поток      | Домены                                          | Протокол | Особенность DPI                                     |
|------------|-------------------------------------------------|----------|-----------------------------------------------------|
| Интерфейс  | youtube.com, youtubei.googleapis.com, ytimg.com | TCP/TLS  | Стандартная инспекция SNI                           |
| Видеопоток | googlevideo.com (rrXX---sn-*.googlevideo.com)   | TCP/TLS  | Агрессивная инспекция, слабые стратегии не проходят |
| QUIC       | googlevideo.com                                 | UDP/QUIC | Отдельная QUIC-инспекция, часто дропается           |

Пример трёхпотокового конфига:

```
--name=youtube-ui
  --filter-tcp=443 --filter-l7=tls
  --payload=tls_client_hello
  --hostlist-domains=youtube.com,youtubei.googleapis.com,ytimg.com
  --lua-desync=multisplit:pos=2:seqovl=1

--new
--name=youtube-video
  --filter-tcp=443 --filter-l7=tls
  --payload=tls_client_hello
  --hostlist-domains=googlevideo.com
  --out-range=-s34228
  --lua-desync=fake:blob=blob_tls_clienthello_www_google_com:badsum:tls_mod=rnd,dupsid,sni=rzd.ru:repeats=4
  --lua-desync=multidisorder:pos=1,sniext+1,host+1,midsld-2,midsld,midsld+2,endhost-1

--new
--name=youtube-quic
  --filter-udp=443 --filter-l7=quic
  --payload=quic_initial
  --lua-desync=fake:blob=fake_default_quic:repeats=6
```

Зачем разделять: стратегия, которая пробивает youtube.com (интерфейс), может не пробивать googlevideo.com (видеопоток).
Для googlevideo нужна более агрессивная стратегия (больше repeats, multidisorder вместо простого split). QUIC —
совершенно другой протокол с отдельной инспекцией.

## Стратегия: syndata + multisplit (SYN data injection)

Нестандартная техника — данные отправляются прямо в SYN-пакете. Некоторые DPI не ожидают payload в SYN и теряют
контекст:

```
--payload=tls_client_hello
--lua-desync=syndata:blob=blob_syn_packet
--lua-desync=multisplit:pos=1,sld+1,endsld-2:seqovl=1
```

Часто комбинируется с дублированием пакетов для надёжности:

```
--payload=tls_client_hello
--lua-desync=syndata:blob=blob_syn_packet
--lua-desync=multisplit:pos=1,sld+1,endsld-2:seqovl=1:dup=2:dup_cutoff=3
```

Используется для googlevideo.com CDN, где стандартные fake-стратегии не проходят. Blob `syn_packet.bin` содержит
специально сформированный SYN payload.

## Стратегия: hostfakesplit с российскими SNI

hostfakesplit подставляет в fake-часть split-а домен "белого" российского сайта. DPI видит легитимный российский SNI и
пропускает трафик:

```
--payload=tls_client_hello
--lua-desync=hostfakesplit:host=rzd.ru:midhost=host-2:seqovl=sniext+3:badsum:tcp_md5
```

Варианты "белых" SNI, зарекомендовавших себя в community:

| Домен              | Контекст                                 |
|--------------------|------------------------------------------|
| `rzd.ru`           | Широко используется как midhost          |
| `ozon.ru`          | Альтернатива rzd.ru                      |
| `msn.com`          | Для tls_mod=sni в fake-пакетах           |
| `fonts.google.com` | Для tls_mod=sni, выглядит как CDN-трафик |

Пример с circular-ротацией двух российских SNI:

```
--payload=tls_client_hello
--in-range=-s5556 --lua-desync=circular:fails=3:maxtime=60
--in-range=x
--lua-desync=hostfakesplit:host=rzd.ru:midhost=host-2:seqovl=sniext+3:badsum:strategy=1
--lua-desync=hostfakesplit:host=ozon.ru:repeats=4:badsum:strategy=2:final
```

## Стратегия: seqovl-pattern с ClientHello российских сайтов

Техника sequence overlap, где перекрывающиеся данные — реальный TLS ClientHello от российского сайта. DPI видит в
overlap "нормальный" российский ClientHello и пропускает:

```
--payload=tls_client_hello
--lua-desync=fakeddisorder:pos=10,midsld:seqovl=336:seqovl_pattern=blob_tls_clienthello_gosuslugi_ru:badsum
```

Эффективные blobs для seqovl-pattern:

- `blob_tls_clienthello_gosuslugi_ru` — Госуслуги
- `blob_tls_clienthello_www_google_com` — Google
- `blob_tls_clienthello_activated` — активационные серверы

Большие значения seqovl (336, 654, 681, 726) нужны для DPI, который анализирует паттерны в TCP window. Малые значения (
1-2) — для статических DPI, которые не отслеживают TCP-состояние.

## Стратегия: fake с hex-паттернами и модификаторами TLS

Вместо blob-файлов можно использовать inline hex-паттерны. Это компактнее и не зависит от наличия файлов:

```
--payload=tls_client_hello
--lua-desync=fake:blob=0x0F0F0F0F:tls_mod=rnd,dupsid,sni=fonts.google.com:badseq:repeats=4
--lua-desync=multidisorder:pos=7,sld+1
```

Модификаторы `tls_mod` в fake-пакетах:

- `rnd` — рандомизация полей TLS ClientHello
- `dupsid` — дублирование Session ID (увеличивает размер fake)
- `sni=<domain>` — подмена SNI в fake на указанный домен
- Комбинация `rnd,dupsid,sni=...` — максимальная маскировка

Специфичные значения `badseq-increment`:

- `0` — нулевой increment (пакет выглядит валидным для DPI, но отбрасывается сервером по другим причинам)
- `2` — минимальный сдвиг
- `10000000` — огромный сдвиг, гарантированно вне TCP window

Параметр `ip_id=zero` — обнуление IP Identification field. Обманывает DPI, которые используют IP ID для трекинга потока.

## Рекомендации по выбору

1. **Начни с простой** (`tcpseg` без circular) — если работает, не усложняй
2. **Если простая не работает** — попробуй multidisorder + fake (широкая совместимость)
3. **Если ломается через время** — добавь circular с 3+ стратегиями
4. **YouTube: раздели на 3 потока** — интерфейс (youtube.com), видео (googlevideo.com), QUIC — каждому своя стратегия
5. **Для googlevideo CDN** — используй агрессивные стратегии: syndata+multisplit, hostfakesplit с российскими SNI, или
   multidisorder с большим числом позиций
6. **Для DPI, чувствительных к SNI** — hostfakesplit с `host=rzd.ru` / `host=ozon.ru`, seqovl-pattern с ClientHello
   российских сайтов
7. **Используй `blockcheckw scan` + `check`** — автоматический подбор всегда лучше ручного
