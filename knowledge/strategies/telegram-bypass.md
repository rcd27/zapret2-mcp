---
title: Telegram и zapret2 — что можно обойти, а что нет
zapret2-version: v0.9.4.5
tags: telegram, mtproto, ip-block, dpi, bypass, vpn, strategies
source: community
created: 2026-03-28
updated: 2026-03-28
---

# Telegram и zapret2: границы возможного

## Как блокируется Telegram в России

Telegram блокируется **двумя способами одновременно**:

### 1. IP-блокировка (основная)

IP-подсети Telegram добавлены в блок-листы ТСПУ:

```
91.108.4.0/22
91.108.8.0/22
91.108.12.0/22
91.108.16.0/22
91.108.20.0/22
91.108.56.0/22
91.105.192.0/23
149.154.160.0/20
149.154.164.0/22
149.154.167.0/24
185.76.151.0/24
95.161.64.0/20
```

При IP-блокировке ТСПУ дропает **все** пакеты к этим адресам, независимо от протокола и содержимого. DPI-анализ не нужен — блокировка происходит на уровне IP-заголовка.

**zapret2 не поможет.** DPI bypass работает за счёт того, что DPI не может распознать протокол. При IP-блокировке содержимое пакета не анализируется вовсе — блокируется сам IP-адрес назначения.

### 2. DPI-инспекция MTProto (дополнительная)

ТСПУ умеет распознавать протокол MTProto (на котором работает Telegram) по сигнатуре первых пакетов. Это используется для:

- Деградации качества (замедление, дроп части пакетов)
- Блокировки соединений, проходящих через нестандартные IP (прокси, relay-серверы)
- Мониторинга MTProto-трафика

**zapret2 может помочь** — nfqws2 умеет определять и обрабатывать MTProto.

## Что zapret2 может сделать с Telegram

### Определение протокола MTProto

zapret2 поддерживает L7-фильтрацию MTProto:

```
--filter-l7=mtproto       # L7 протокол: MTProto
--payload=mtproto_initial  # Payload: первый пакет MTProto
```

### Desync MTProto-трафика

Пример секции для Telegram в многосекционном конфиге:

```
--name=telegram-media
  --filter-l7=mtproto
  --payload=mtproto_initial
  --lua-desync=fake:blob=0x00000000
```

Это отправляет fake-пакет перед реальным MTProto Initial, сбивая DPI-парсер.

### Когда это работает

1. **Telegram через прокси/relay**: если Telegram использует relay-серверы на IP-адресах, которые не заблокированы по IP, но ТСПУ распознаёт MTProto по сигнатуре и блокирует — fake-пакеты могут помочь
2. **Деградация MTProto**: если ТСПУ не блокирует полностью, а замедляет (capacity < 100%) — DPI bypass убирает распознавание протокола → capacity не применяется
3. **Telegram звонки**: VoIP-трафик Telegram может проходить через нестандартные порты/IP — DPI-инспекция MTProto может быть единственным способом блокировки → zapret2 помогает
4. **Telegram медиа**: загрузка медиафайлов может идти через CDN-серверы, которые не заблокированы по IP, но трафик к которым инспектируется DPI

### Полный пример конфига с Telegram

```
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
  --lua-desync=multisplit:blob=fake_default_tls:tcp_ts=-1000:pos=2:nodrop
--new
--name=telegram-media --filter-l7=mtproto
  --payload=mtproto_initial
  --lua-desync=fake:blob=0x00000000
--new
--name=quic --filter-udp=443 --filter-l7=quic
  --payload=quic_initial
  --lua-desync=fake:blob=fake_default_quic:repeats=6
"
```

## Что zapret2 НЕ может сделать с Telegram

### IP-блокировка — только VPN

Если IP-адреса Telegram заблокированы целиком (что является основным методом блокировки в РФ), zapret2 бессилен. Для обхода IP-блокировки нужен **VPN или прокси**:

- **Podkop** + community list `telegram` (самый популярный вариант на OpenWrt)
- **AmneziaWG** (WireGuard с обфускацией)
- **VLESS + Reality** через прокси-сервер
- **MTProto Proxy** (встроенная поддержка в Telegram)

### Типичная рабочая конфигурация

На практике для Telegram используют VPN/прокси, а zapret2 — для YouTube и других ресурсов, где блокировка через DPI:

```
Telegram, Instagram, Facebook → Podkop (VPN/прокси) → через туннель
YouTube, Discord → zapret2 (DPI bypass) → напрямую через провайдера
```

Это разделение видно во всех community-конфигах:
- Podkop: `community_lists 'telegram'`, `community_lists 'meta'`
- Zapret2: `hostlist-domains=youtube.com,googlevideo.com`

## Диагностика: DPI или IP-блокировка?

```bash
# Проверить доступность IP Telegram
ping -c 3 149.154.167.50
# Если timeout → IP заблокирован → нужен VPN

# Проверить через blockcheckw (если доступен)
blockcheckw status -d web.telegram.org
# "IP blocked" → VPN
# "DPI blocked" → zapret2 может помочь

# Проверить TCP-соединение
curl -m 5 https://web.telegram.org
# Если timeout → скорее всего IP-блок
# Если connection reset → DPI-блок, zapret2 может помочь
```

## Резюме

| Сценарий | zapret2 поможет? | Что использовать |
|---|---|---|
| Telegram заблокирован по IP | **Нет** | VPN/прокси (Podkop, AWG, VLESS) |
| MTProto замедляется ТСПУ | **Да** | `--filter-l7=mtproto --lua-desync=fake` |
| Telegram звонки не работают | **Возможно** | Попробовать zapret2, fallback на VPN |
| Telegram медиа через CDN | **Возможно** | zapret2 для CDN + VPN для основного |
| web.telegram.org | **Да** (это HTTPS) | Стандартная TLS-стратегия |
