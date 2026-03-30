---
title: YouTube Opens But Video Does Not Load
zapret2-version: v0.9.4.5
tags: youtube, googlevideo, CDN, video, troubleshooting, badsum, aggressive, desktop, three-stream, quic
created: 2026-03-29
updated: 2026-03-30
source: community, deepwiki/bol-van/zapret2
---

# YouTube открывается, но видео не грузится

## Симптомы

- Страница youtube.com загружается нормально (поиск, рекомендации, комментарии)
- Видео не воспроизводится: бесконечная загрузка или ошибка воспроизведения
- Превью (thumbnails) могут загружаться, а сам видеопоток — нет
- Проблема на десктопе (браузер Chrome/Firefox), не на Smart TV

## Причина: трёхпотоковая модель YouTube

YouTube использует **три типа трафика**, и DPI обрабатывает каждый по-разному:

| Поток          | Домены                                          | Протокол | Инспекция DPI                                  |
|----------------|-------------------------------------------------|----------|------------------------------------------------|
| **Интерфейс**  | youtube.com, youtubei.googleapis.com, ytimg.com | TCP/TLS  | Стандартная, обычный split2 проходит           |
| **Видеопоток** | googlevideo.com (rrXX---sn-*.googlevideo.com)   | TCP/TLS  | **Агрессивная** — слабые стратегии не проходят |
| **QUIC**       | googlevideo.com                                 | UDP/QUIC | **Отдельная** инспекция, часто дропается ТСПУ  |

Стратегия, которая пробивает youtube.com (интерфейс), может не пробивать googlevideo.com CDN. А QUIC — это совершенно
другой протокол, требующий отдельной стратегии.

**Рекомендация:** создавать **отдельные профили** для каждого потока (см. community-strategies.md → "Трёхпотоковая
модель YouTube").

## Диагностика

### 1. Проверить что проблема именно в DPI

```bash
# С VPN видео грузится? Если да — DPI-блокировка
# Без VPN curl на googlevideo:
curl -v --resolve "r1---sn-test.googlevideo.com:443:216.58.209.46" \
     https://r1---sn-test.googlevideo.com/ 2>&1 | head -20
```

### 2. Проверить QUIC

QUIC (UDP 443) часто блокируется или дропается для YouTube. Если QUIC не обрабатывается zapret2, браузер может пытаться
использовать его вместо TCP и зависать.

```bash
# Проверить что QUIC либо обрабатывается zapret2, либо заблокирован
nft list table inet zapret2 | grep "udp dport 443"
```

**Быстрое решение — заблокировать QUIC**, чтобы браузер fallback на TCP:

```bash
nft add rule inet zapret2 postrouting_hook udp dport 443 drop
```

Или через конфиг zapret2 — убрать UDP 443 из обрабатываемых портов.

### 3. Проверить hostlist

googlevideo.com должен быть в hostlist:

```bash
grep -i googlevideo /opt/zapret2/zapret_hosts_user.txt
```

Если нет — добавить:

```
googlevideo.com
```

## Решение: агрессивная стратегия для YouTube

### Вариант 1: multidisorder + fake с badsum

Рабочая community-стратегия для десктопного YouTube:

```
--out-range=-s34228
--payload=tls_client_hello
--lua-desync=multidisorder:pos=1,sniext+1,host+1,midsld-2,midsld,midsld+2,endhost-1
--lua-desync=fake:blob=blob_tls_clienthello_www_google_com:optional:tcp_seq=-10000:tcp_ack=-66000:badsum:tls_mod=rnd,dupsid,sni=rzd.ru:repeat=4
```

**Что делает:**

- `multidisorder` — разбивает ClientHello в 7 позициях (SNI extension, hostname, mid-SLD × 3, конец hostname),
  отправляет сегменты в обратном порядке
- `fake` с `badsum` — отправляет 4 поддельных ClientHello с испорченной TCP-контрольной суммой. DPI их видит, сервер —
  отбрасывает
- `out-range=-s34228` — обрабатывает первые ~25 TCP-пакетов (~34 КБ), достаточно для всех ClientHello
- `tls_mod=rnd,dupsid,sni=rzd.ru` — рандомизация TLS, дублирование Session ID, подмена SNI в fake-пакете

### Вариант 2: circular-стратегия с автоматическим перебором

zapret2 включает предсобранный профиль `youtube` с 14 вариантами стратегий в circular-ротации. Если одна стратегия не
работает — автоматически переключается на следующую.

Включение:

```bash
# В config
MODE=nfqws2
NFQWS2_ENABLE=1
# Использовать профиль youtube
```

### Вариант 3: найти стратегию через blockcheckw

Самый надёжный подход — просканировать что работает именно для вашего провайдера:

```bash
blockcheckw scan --target youtube.com --target googlevideo.com -j 128
```

Важно: сканировать именно `googlevideo.com`, а не только `youtube.com`.

## Почему badsum

Для googlevideo CDN агрессивные fooling-методы работают лучше:

| Метод        | Механизм                                          | Для googlevideo                |
|--------------|---------------------------------------------------|--------------------------------|
| `badsum`     | Испорченная TCP checksum, NIC сервера отбрасывает | Работает в большинстве случаев |
| `md5sig`     | Фальшивая TCP MD5 подпись, сервер отклоняет       | Надёжнее на Linux-серверах     |
| `ip_autottl` | TTL = расстояние до DPI, пакет умирает до сервера | Зависит от топологии           |

`badsum` — наиболее распространённый выбор для YouTube CDN в community-стратегиях.

## Важно

- Стратегия зависит от провайдера и региона — "серебряной пули" не существует
- После применения стратегии очистить кеш браузера или проверить в incognito
- Если после смены стратегии видео всё ещё не грузится — проверить что QUIC заблокирован (см. выше)
- На Smart TV проблема может быть другой (TLS 1.2 vs 1.3) — см. статью "Smart TV YouTube Troubleshooting"
