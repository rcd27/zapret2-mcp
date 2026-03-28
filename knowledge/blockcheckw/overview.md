---
title: blockcheckw Overview
blockcheckw-version: v0.8.3
tags: blockcheckw, scanner, strategy discovery, parallel, rust
source: official-docs
created: 2026-03-25
updated: 2026-03-25
---

# blockcheckw — быстрый сканер стратегий

blockcheckw (https://github.com/rcd27/blockcheckw) — высокопроизводительный сканер стратегий DPI bypass для zapret2, написанный на Rust.

## Ключевые преимущества

- **Скорость**: 100-150x быстрее blockcheck2.sh (~2 мин vs ~90 мин)
- **Throughput**: ~150 стратегий/сек vs ~1 стратегия/сек
- **Параллелизм**: до 1024 воркеров через nftables vmap dispatch (O(1) lookup)
- **TLS fingerprint**: rustls вместо curl/OpenSSL
- **9 архитектур**: x86_64, x86, arm64, arm, mips, mipsel, mips64, ppc, riscv64
- **16KB DPI detection**: обнаруживает DPI, который обрезает соединение после ~16KB данных

## База стратегий

blockcheckw включает встроенную базу из 13,943 стратегий:
- **http.txt**: 965 стратегий для HTTP (порт 80)
- **tls12.txt**: 8,648 стратегий для TLS 1.2 (порт 443)
- **tls13.txt**: 4,330 стратегий для TLS 1.3 (порт 443)

## Архитектура параллелизма

Каждый воркер получает уникальный SO_MARK и свой NFQUEUE:
```
Worker 0: fwmark=0x20000001 → nfqws2 queue num 200
Worker 1: fwmark=0x20000002 → nfqws2 queue num 201
...
Worker N: fwmark=0x200000XX → nfqws2 queue num 200+N
```

nftables vmap обеспечивает O(1) маршрутизацию пакетов к нужному воркеру.

## Требования

- Linux с root-правами (SO_MARK, nftables, NFQUEUE)
- nfqws2 бинарник (из zapret2)
- nftables
