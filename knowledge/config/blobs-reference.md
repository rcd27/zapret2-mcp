---
title: Blobs — каталог бинарных образцов пакетов
zapret2-version: v0.9.4.5
tags: blobs, fake, payload, tls, quic, wireguard, discord, reference
source: official-docs
created: 2026-03-28
updated: 2026-03-28
---

# Blobs: бинарные образцы пакетов

Blobs — бинарные файлы-образцы пакетов в `/opt/zapret2/files/fake/`. Используются для:
- Отправки fake-пакетов (подставить вместо реального содержимого)
- Sequence overlap (перекрывающиеся данные)
- Паттернов для модификации

## TLS ClientHello

| Файл | Описание |
|---|---|
| `tls_clienthello_www_google_com.bin` | Google |
| `tls_clienthello_vk_com.bin` | VK |
| `tls_clienthello_t2_ru.bin` | Tele2 |
| `tls_clienthello_gosuslugi_ru.bin` | Госуслуги |
| `tls_clienthello_sberbank_ru.bin` | Сбербанк |
| `tls_clienthello_iana_org.bin` | IANA |
| `tls_clienthello_www_4pda_to.bin` | 4PDA |
| `tls_clienthello_www_max_ru.bin` | Max.ru |
| `tls_clienthello_*_kyber.bin` | С Kyber (пост-квант) |

## QUIC Initial

| Файл | Описание |
|---|---|
| `quic_initial_www_google_com.bin` | Google |
| `quic_initial_facebook_com.bin` | Facebook |
| `quic_initial_vk_com.bin` | VK |
| `quic_initial_rutracker_org.bin` | RuTracker |
| `quic_initial_kyber.bin` | С Kyber |

## Другие протоколы

| Файл | Описание |
|---|---|
| `http_iana_org.bin` | HTTP запрос |
| `stun.bin` | STUN (WebRTC) |
| `dht_get_peers.bin` | BitTorrent DHT get_peers |
| `dht_find_node.bin` | BitTorrent DHT find_node |
| `wireguard_initiation.bin` | WireGuard Initiation |
| `wireguard_response.bin` | WireGuard Response |
| `discord-ip-discovery-*.bin` | Discord IP Discovery |
| `sip.bin` | SIP протокол |
| `sip_register.bin` | SIP REGISTER |
| `rdp.bin` | RDP |
| `dns.bin` | DNS запрос |
| `ntp4.bin` | NTP v4 |
| `bgp_open.bin` | BGP OPEN |
| `bitcoin.bin` | Bitcoin |
| `smtp_ehlo.bin` | SMTP EHLO |
| `snmp_get_next_request.bin` | SNMP GetNextRequest |
| `rtsp_options.bin` | RTSP OPTIONS |
| `tls_alert.bin` | TLS Alert |
| `tls_clienthello_google_com_tlsrec.bin` | Google (TLS Record) |
| `tls_serverhello_google_com_tls13.bin` | Google ServerHello TLS 1.3 |
| `dtls_serverhello.bin` | DTLS ServerHello |

## Служебные

| Файл | Описание |
|---|---|
| `zero_256.bin` | 256 нулевых байт |
| `zero_512.bin` | 512 нулевых байт |
| `zero_1024.bin` | 1024 нулевых байта |

## Использование blobs

### В стратегиях (lua-desync)

```
# По имени (blob загружен в память при старте):
--lua-desync=fake:blob=blob_tls_clienthello_www_google_com:tcp_md5

# Inline hex:
--lua-desync=fake:blob=0x0F0F0F0F

# Из файла:
--blob=my_blob:@/path/to/file.bin
--lua-desync=fake:blob=my_blob:tcp_md5
```

### Предопределённые имена

При использовании без указания конкретного файла:
- `fake_default_tls` — стандартный fake TLS ClientHello
- `fake_default_http` — стандартный fake HTTP-запрос
- `fake_default_quic` — стандартный fake QUIC Initial

### Добавление своих blobs

1. Поместить `.bin` файл в `/opt/zapret2/files/fake/`
2. Загрузить через `--blob=имя:@путь` в командной строке
3. Использовать в стратегиях через `blob=имя`

### Создание blob из реального трафика

Захват TLS ClientHello с помощью ncat на роутере:

```bash
# На роутере — запустить скрипт-прокси:
ncat -l -p 8443 -c 'head -c 517 > /tmp/client_hello.bin; cat'

# На клиенте (ПК) — отправить запрос через роутер:
curl -k --resolve example.com:443:IP_РОУТЕРА https://example.com:8443/

# Результат: /tmp/client_hello.bin
```

**Рекомендация:** использовать готовые blobs из пакета zapret2 — они покрывают большинство сценариев.

### Управление памятью

Каждый включённый blob загружается в память nfqws2 при старте. Включать только те blobs, которые реально используются в стратегиях.
