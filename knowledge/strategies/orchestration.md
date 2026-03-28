---
title: Strategy Orchestration
zapret2-version: v0.9.4.5
tags: circular-strategy, rotation, resilience, multi-strategy, profiles
---

# Оркестрация стратегий

## Circular Strategy (ротация)
```
--dpi-desync-circular-strategy=N
```
Автоматическая ротация между N стратегиями. Когда текущая стратегия перестаёт работать, nfqws2 переключается на следующую. Обеспечивает устойчивость к обновлениям DPI без ручного вмешательства.

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

## Фильтры профилей

```
--filter-tcp=[~]port1[-port2]    # TCP порт (~ = инвертировать)
--filter-udp=[~]port1[-port2]    # UDP порт
--filter-l7=proto[,proto]        # L7 протокол: http, tls, quic, dns, и др.
--filter-l3=ipv4|ipv6            # IP версия
```

## Рекомендации

- Создавай отдельные профили для HTTP, TLS и QUIC — у них разная логика bypass
- Для resilience используй circular-strategy внутри каждого профиля
- `<HOSTLIST>` заменяется на путь к списку доменов при запуске
- `<HOSTLIST_NOAUTO>` — список без автодобавления (для QUIC, где autodetect ненадёжен)
