---
title: Discord bypass — обход блокировки чата, голоса и медиа
zapret2-version: v0.9.4.5
tags: discord, stun, voip, voice, udp, strategies, bypass, cloudflare-ports
source: community
created: 2026-03-28
updated: 2026-07-10
---

# Discord bypass через zapret2

Discord блокируется в России на нескольких уровнях. Для полноценной работы (чат, голос, медиа) нужно обрабатывать **три
типа трафика** отдельными стратегиями.

> **Важно: Discord — это ещё и IP-троттлинг, а не только DPI.** Инфраструктура Discord мигрирует на Cloudflare
> (голос — публично признано в феврале 2026), а ресурсы за Cloudflare в РФ троттлятся по IP: отдаётся ~16 КБ, дальше
> обрыв. DPI-стратегии ниже чинят распознавание сайта/голоса/медиа, но **не** снимают IP-троттлинг за Cloudflare —
> там нужен туннель. Диагностика и раздельная маршрутизация: `troubleshooting/ip-throttling.md`.

## Как блокируется Discord

| Компонент                        | Протокол                          | Порты                        | Тип блокировки                     |
|----------------------------------|-----------------------------------|------------------------------|------------------------------------|
| Сайт и API (discord.com)         | HTTPS (TLS)                       | 443                          | DPI по SNI                         |
| Обновления (updates.discord.com) | HTTPS (TLS)                       | 443                          | DPI по SNI, отдельная стратегия    |
| Медиа (discord.media)            | HTTPS (TLS)                       | 2053, 2083, 2087, 2096, 8443 | DPI по SNI на нестандартных портах |
| Голос (VoIP)                     | UDP (Discord IP Discovery + STUN) | 50000-50099                  | DPI по протоколу                   |
| Игровые активности               | UDP                               | 19294-19344                  | DPI по протоколу                   |

## Стратегии

### 1. Discord HTTPS (сайт, API, чат)

Стандартная TLS-стратегия. Discord использует TLS 1.3. Часто достаточно той же стратегии что и для YouTube.

**zapret2 (lua-desync):**

```
--name=discord-tls
  --filter-tcp=443 --filter-l7=tls
  --payload=tls_client_hello
  --hostlist-domains=discord.com,discord.gg,discord.media,discordapp.com,discordapp.net
  --lua-desync=multidisorder:pos=2
```

### 2. Discord Updates (updates.discord.com)

Обновления Discord блокируются отдельно. Иногда требуется собственная стратегия.

**zapret2:**

```
--name=discord-updates
  --filter-tcp=443 --filter-l7=tls
  --payload=tls_client_hello
  --hostlist-domains=updates.discord.com
  --lua-desync=fakedsplit:pos=1:tcp_ack=-66000
```

### 3. Discord Media (нестандартные порты)

Медиаконтент Discord может ходить через Cloudflare-порты. Нужно добавить их в перехват.

**Порты:** `2053, 2083, 2087, 2096, 8443`

Добавить в конфиг:

```
NFQWS_PORTS_TCP=80,443,2053,2083,2087,2096,8443
```

**zapret2:**

```
--name=discord-media
  --filter-tcp=2053,2083,2087,2096,8443
  --filter-l7=tls
  --payload=tls_client_hello
  --hostlist-domains=discord.media
  --lua-desync=multisplit:seqovl=652:pos=2
```

### 4. Discord Voice (голосовые каналы) — самое важное

Голос в Discord использует UDP-протоколы **Discord IP Discovery** и **STUN** на портах **50000-50099**. Это НЕ TLS — это
отдельные протоколы, которые nfqws2 умеет определять через `--filter-l7=discord,stun`.

**Добавить порты в перехват:**

```
NFQWS_PORTS_UDP=443,50000-50099
```

**zapret2 (lua-desync):**

```
--name=discord-voice
  --filter-udp=50000-50099
  --filter-l7=discord,stun
  --lua-desync=fake:blob=0x00:repeats=6
```

Community-практика: вместо нулевого fake (`blob=0x00`) можно использовать `blob=quic_initial_www_google_com` — DPI видит
"легитимный" Google QUIC. Нулевой blob тоже работает, но менее надёжен на агрессивных DPI.

С версии zapret v70.6 — нативное определение протоколов Discord IP Discovery и STUN. До этой версии использовался
custom.d скрипт `50-discord`.

### 5. Discord + игровые активности

Для игровых активностей Discord дополнительно:

```
--name=discord-games
  --filter-udp=19294-19344
  --filter-l7=discord,stun
  --lua-desync=fake:blob=0x00:repeats=6
```

## Домены Discord

Минимальный набор:

```
discord.com
discord.gg
discord.media
discordapp.com
discordapp.net
```

Расширенный набор:

```
discord.com
discord.gg
discord.media
discord.new
discord.gift
discord.gifts
discord.store
discord.design
discord.dev
discord.co
discord.app
discordapp.com
discordapp.net
discordapp.io
discordapp.org
discordcdn.com
discordstatus.com
discordactivities.com
discordsays.com
discordmerch.com
discordpartygames.com
discord.tools
discord-activities.com
discord-attachments-uploads-prd.storage.googleapis.com
dis.gd
```

## Полный конфиг: YouTube + Discord

```
NFQWS_PORTS_TCP=80,443,2053,2083,2087,2096,8443
NFQWS_PORTS_UDP=443,19294-19344,50000-50100

NFQWS2_OPT="
--name=youtube
  --filter-tcp=443 --filter-l7=tls
  --payload=tls_client_hello
  --hostlist-domains=youtube.com,googlevideo.com,youtubei.googleapis.com
  --lua-desync=multisplit:pos=10:seqovl=1
--new
--name=discord-updates
  --filter-tcp=443 --filter-l7=tls
  --payload=tls_client_hello
  --hostlist-domains=updates.discord.com
  --lua-desync=fakedsplit:pos=1:tcp_ack=-66000
--new
--name=discord-tls
  --filter-tcp=443 --filter-l7=tls
  --payload=tls_client_hello
  --hostlist-domains=discord.com,discord.gg,discord.media,discordapp.com,discordapp.net
  --lua-desync=multidisorder:pos=2
--new
--name=discord-media
  --filter-tcp=2053,2083,2087,2096,8443
  --hostlist-domains=discord.media
  --lua-desync=multisplit:seqovl=652:pos=2
--new
--name=discord-voice
  --filter-udp=19294-19344,50000-50100
  --filter-l7=discord,stun
  --lua-desync=fake:blob=0x00:repeats=6
--new
--name=quic
  --filter-udp=443 --filter-l7=quic
  --payload=quic_initial
  --lua-desync=fake:blob=fake_default_quic:repeats=6
"
```

## Типичные проблемы

### "Чат работает, голос — нет"

Чат Discord — это HTTPS (порт 443). Голос — UDP (порты 50000-50099). Если не добавить UDP-порты и стратегию для
`discord,stun` — голос не заработает.

**Решение:** добавить `NFQWS_PORTS_UDP=443,50000-50099` и стратегию
`--filter-udp=50000-50099 --filter-l7=discord,stun --lua-desync=fake:blob=0x00:repeats=6`.

### "Discord работал и перестал"

DPI обновился. Попробовать:

1. Сменить стратегию (другой fooling метод)
2. Запустить blockcheckw для `discord.com`
3. Попробовать circular-стратегию

### "zapret2 режет исходящую скорость"

При агрессивных стратегиях с `repeats=15+` и широким out-range nfqws2 обрабатывает много пакетов. Для Discord достаточно
`repeats=6`. Также помогает ограничение `--out-range=-s34228` (обрабатывать только первые ~25 пакетов).

### «Всё настроено, а Discord не грузится» — IP-троттлинг Cloudflare

Стратегии подобраны, handshake проходит, но Discord и сайты всё равно висят и подгружают только начало — это,
скорее всего, **не** DPI, а IP-троттлинг инфраструктуры за Cloudflare (отдаётся ~16 КБ, затем обрыв; QUIC и TLS
душатся одинаково). Смена fooling-метода тут не помогает.

**Проверка:** `curl -m 10 -o /dev/null -w "%{size_download} bytes\n" https://discord.com/` — остановка около 16 КБ
подтверждает троттлинг.
**Решение:** основную инфраструктуру Discord пустить через туннель (Podkop/AmneziaWG/VLESS), zapret2 оставить для
DPI-распознавания. Подробно: `troubleshooting/ip-throttling.md`.

### Игровые порты (Warframe, Roblox и др.)

Некоторые игры используют нестандартные порты для TLS (например Warframe: 6695-6710). Добавить в `NFQWS_PORTS_TCP`:

```
NFQWS_PORTS_TCP=80,443,2053,2083,2087,2096,6695-6710,8443
```

## Предустановленные скрипты zapret2

Пакет zapret2 включает готовый custom-скрипт:

| Скрипт             | Назначение                     |
|--------------------|--------------------------------|
| `50-discord-media` | Голосовые/видео каналы Discord |
| `50-quic4all`      | QUIC для всего трафика         |
| `50-stun4all`      | STUN/WebRTC                    |

Включение через UCI:

```bash
uci set zapret2.main.custom_scripts='1'
uci commit zapret2
/etc/init.d/zapret2 restart
```
