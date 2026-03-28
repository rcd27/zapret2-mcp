---
title: DPI Types and Recommended Approaches
zapret2-version: v0.9.4.5
tags: dpi, domain-based, stateful, stateless, recommendations
source: official-docs
created: 2026-03-25
updated: 2026-03-25
---

# Типы DPI и рекомендуемые подходы

## Domain-based DPI (инспектирует SNI/Host)

Самый распространённый тип. DPI читает SNI в TLS ClientHello или Host в HTTP и блокирует по домену.

Рекомендации:
```
--dpi-desync=split2 --dpi-desync-split-pos=host
```
Или с overlap для устойчивости:
```
--dpi-desync=split2 --dpi-desync-split-pos=host --dpi-desync-split-seqovl=1
```

## Stateful DPI (отслеживает TCP-состояние)

DPI собирает TCP-сессию и анализирует полный поток. Простое разбиение не помогает — DPI пересоберёт.

Рекомендации:
```
--dpi-desync=fake,split2 --dpi-desync-fooling=md5sig
```
Или RST-инъекция:
```
--dpi-desync=rst --dpi-desync-fooling=ip_autottl
```

## Stateless DPI (инспектирует отдельные пакеты)

DPI смотрит на каждый пакет независимо, не собирая сессию.

Рекомендации:
```
--dpi-desync=ipfrag2
```
Или:
```
--dpi-desync=disorder2
```

## HTTP-only DPI

DPI блокирует только HTTP (порт 80), не трогает HTTPS.

Рекомендации:
```
--hostcase --dpi-desync=split2 --dpi-desync-split-http-req=method+host
```

## Как определить тип DPI

1. Если `split2` без fakes работает → domain-based DPI
2. Если нужны fakes + fooling → stateful DPI
3. Если `disorder2` без fakes работает → stateless DPI
4. Если блокируется только HTTP → HTTP-only DPI
5. Если ничего не работает, но VPN работает → IP-level blocking (zapret2 не поможет)

## Классификация блокировки через blockcheckw

blockcheckw (https://github.com/rcd27/blockcheckw) умеет классифицировать тип блокировки:
- **available** — домен доступен без bypass
- **SNI blocked** — DPI блокирует по SNI → можно обойти
- **IP blocked** — блокировка по IP → нужен VPN
- **DNS failed** — проблема с DNS-резолвером

Команда для проверки:
```bash
blockcheckw status --domain-list blocked.txt
```
