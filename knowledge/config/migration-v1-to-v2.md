---
title: Миграция стратегий zapret v1 → zapret2 (lua-desync)
zapret2-version: v0.9.4.5
tags: migration, v1, v2, lua-desync, dpi-desync, config, conversion
source: telegram/@itdogchat, telegram/@routerich, community
created: 2026-03-28
updated: 2026-03-28
---

# Миграция стратегий с zapret v1 на zapret2

## Зачем мигрировать

zapret2 (nfqws2) использует новый синтаксис `--lua-desync` вместо старого `--dpi-desync`. Старый синтаксис **всё ещё работает** в zapret2 (обратная совместимость), но:

- Новый lua-формат более гибкий и позволяет комбинировать инстансы
- Многосекционные конфиги (`--new`) — только в zapret2
- L7-фильтрация (`--filter-l7=tls,quic,mtproto`) — только в zapret2
- Inline hostlists (`--hostlist-domains=`) — только в zapret2

## Маппинг параметров

### Базовая структура

```
# zapret v1 (NFQWS_OPT):
--dpi-desync=<strategy> --dpi-desync-split-pos=<pos> --dpi-desync-fooling=<method> ...

# zapret2 (NFQWS2_OPT):
--lua-desync=<action>:param1=val1:param2=val2
```

### Стратегии → Actions

| zapret v1 (`--dpi-desync=`) | zapret2 (`--lua-desync=`) | Заметки |
|---|---|---|
| `split2` | `multisplit` | Указать `pos=` |
| `disorder2` | `multidisorder` | Указать `pos=` |
| `fake` | `fake` | + `blob=` для payload |
| `fake,split2` | Два `--lua-desync`: `fake:...` и `multisplit:...` | Разделяются на инстансы |
| `fake,disorder2` | Два `--lua-desync`: `fake:...` и `multidisorder:...` | |
| `fake,multisplit` | Два `--lua-desync`: `fake:...` и `multisplit:...` | |
| `fake,multidisorder` | Два `--lua-desync`: `fake:...` и `multidisorder:...` | |
| `fakedsplit` | `fakedsplit` | Комбинированный fake+split |
| `ipfrag2` | `ipfrag2` | Без изменений |

### Параметры split/disorder

| zapret v1 | zapret2 (внутри lua-desync) | Пример |
|---|---|---|
| `--dpi-desync-split-pos=1,midsld` | `pos=1,midsld` | `--lua-desync=multisplit:pos=1,midsld` |
| `--dpi-desync-split-seqovl=681` | `seqovl=681` | `--lua-desync=multisplit:pos=10:seqovl=1` |
| `--dpi-desync-repeats=11` | `repeats=11` | `--lua-desync=fake:repeats=11` |

### Параметры fake

| zapret v1 | zapret2 | Пример |
|---|---|---|
| `--dpi-desync-fake-tls=/path/file.bin` | `blob=@/path/file.bin` | |
| `--dpi-desync-fake-tls=0x00000000` | `blob=0x00000000` | |
| (стандартный fake) | `blob=fake_default_tls` | Предопределённый blob |
| `--dpi-desync-fake-tls-mod=rnd,dupsid,sni=X` | `tls_mod=rnd,dupsid,sni=X` | |

### Fooling параметры

| zapret v1 | zapret2 | Заметки |
|---|---|---|
| `--dpi-desync-fooling=md5sig` | `tcp_md5` | Внутри lua-desync |
| `--dpi-desync-fooling=badseq` | `tcp_seq=<offset>` | Нужно указать offset |
| `--dpi-desync-fooling=badsum` | `badsum` | |
| `--dpi-desync-fooling=ip_autottl` | (см. документацию) | |
| `--dpi-desync-ttl=3` | `ip_ttl=3` | |
| `--ip-id=zero` | `ip_id=rnd` | Не точный аналог |

### Фильтры

| zapret v1 | zapret2 | Заметки |
|---|---|---|
| `--filter-tcp=443` | `--filter-tcp=443` | Без изменений |
| `--hostlist=/path/file.txt` | `--hostlist=/path/file.txt` | Без изменений |
| (нет аналога) | `--filter-l7=tls` | Новое: L7-фильтрация |
| (нет аналога) | `--payload=tls_client_hello` | Новое: фильтр по payload |
| (нет аналога) | `--hostlist-domains=a.com,b.com` | Новое: inline domains |
| (нет аналога) | `--name=youtube` | Новое: именование секций |
| (нет аналога) | `--new` | Новое: разделитель секций |

## Примеры миграции

### Пример 1: Простая стратегия

```
# zapret v1:
NFQWS_OPT="--filter-tcp=443 --dpi-desync=split2 --dpi-desync-split-pos=10 --dpi-desync-split-seqovl=1"

# zapret2:
NFQWS2_OPT="--filter-tcp=443 --filter-l7=tls --payload=tls_client_hello --lua-desync=multisplit:pos=10:seqovl=1"
```

### Пример 2: Fake + multidisorder

```
# zapret v1:
NFQWS_OPT="--filter-tcp=443
  --hostlist=/opt/zapret/ipset/zapret-hosts-google.txt
  --dpi-desync=fake,multidisorder
  --dpi-desync-split-pos=1,midsld
  --dpi-desync-repeats=11
  --dpi-desync-fooling=badseq
  --dpi-desync-fake-tls=0x00000000
  --dpi-desync-fake-tls-mod=rnd,dupsid,sni=www.google.com"

# zapret2:
NFQWS2_OPT="--filter-tcp=443 --filter-l7=tls
  --payload=tls_client_hello
  --hostlist=/opt/zapret2/ipset/zapret-hosts-google.txt
  --lua-desync=fake:blob=0x00000000:tls_mod=rnd,dupsid,sni=www.google.com:repeats=11:tcp_seq=-10000
  --lua-desync=multidisorder:pos=1,midsld"
```

**Важно**: в v1 `fake,multidisorder` — это одна директива. В v2 это **два отдельных** `--lua-desync`, каждый со своими параметрами.

### Пример 3: Полный многосекционный конфиг

```
# zapret v1 (один монолитный конфиг):
NFQWS_OPT="--filter-tcp=443 --dpi-desync=multidisorder --dpi-desync-split-pos=2"
NFQWS_OPT_DESYNC_QUIC="--dpi-desync=fake --dpi-desync-repeats=6"

# zapret2 (секции через --new):
NFQWS2_OPT="
--name=http --filter-tcp=80 --filter-l7=http
  --payload=http_req
  --lua-desync=http_methodeol
--new
--name=youtube --filter-tcp=443 --filter-l7=tls
  --payload=tls_client_hello
  --hostlist-domains=youtube.com,googlevideo.com,youtubei.googleapis.com
  --lua-desync=multisplit:pos=10:seqovl=1
--new
--name=other-tls --filter-tcp=443 --filter-l7=tls
  --payload=tls_client_hello
  --lua-desync=multidisorder:pos=2
--new
--name=quic --filter-udp=443 --filter-l7=quic
  --payload=quic_initial
  --lua-desync=fake:blob=fake_default_quic:repeats=6
"
```

## Автоматический конвертер

Community-инструмент для автоматической конвертации:
- **nfqws-zapret-converter**: `github.com/whxtelxs/nfqws-zapret-converter`

## Что нельзя конвертировать 1-в-1

- `--dpi-desync-fooling=badseq` в v1 автоматически подбирал increment. В v2 нужно явно указать `tcp_seq=<offset>` (часто `-10000` или `-66000`)
- `--dpi-desync-fooling=badseq --dpi-desync-badseq-increment=0` → в v2 это `tcp_seq=0` или отдельная логика
- Параметр `<HOSTLIST>` в v1 подставлялся автоматически в зависимости от `MODE_FILTER`. В v2 рекомендуется указывать hostlist явно
- В v1 отдельные переменные `NFQWS_OPT_DESYNC_QUIC`, `NFQWS_OPT_DESYNC_HTTP` и т.д. В v2 всё в одном `NFQWS2_OPT` через секции `--new`

## Совет

Не обязательно конвертировать. zapret2 **поддерживает старый синтаксис** `--dpi-desync`. Если v1-стратегия работает — можно использовать как есть. Мигрировать на lua-desync стоит когда:
- Нужны разные стратегии для разных доменов (секции `--new`)
- Нужна L7-фильтрация (`--filter-l7=tls,quic,mtproto`)
- Нужен inline hostlist (`--hostlist-domains=`)
- Стратегия перестала работать и нужна более тонкая настройка
