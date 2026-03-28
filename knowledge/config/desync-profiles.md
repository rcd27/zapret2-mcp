---
title: Desync Profile System
zapret2-version: v0.9.4.5
tags: profiles, desync, new, filter, matching, template, import, lua-desync, l7, l3, l4
source: deepwiki/bol-van/zapret2, official-docs
created: 2026-03-28
updated: 2026-03-28
---

# Система desync-профилей

Профиль — основная единица конфигурации zapret2. Каждый профиль инкапсулирует полную стратегию обхода DPI: правила фильтрации пакетов, целевые хостлисты/IP-диапазоны и цепочку Lua desync-функций.

## Создание профилей

Профили создаются через разделитель `--new`:

```
--name=youtube --filter-tcp=443 --filter-l7=tls
  --payload=tls_client_hello
  --hostlist-domains=youtube.com,googlevideo.com
  --lua-desync=fake:blob=fake_default_tls:tcp_md5
  --lua-desync=multisplit:pos=1,midsld
--new
--name=quic --filter-udp=443 --filter-l7=quic
  --payload=quic_initial
  --lua-desync=fake:blob=fake_default_quic:repeats=6
```

Каждый `--new` начинает новый профиль. Параметры до первого `--new` относятся к первому профилю.

## Многоуровневая фильтрация

Профиль содержит каскад фильтров. Пакет проверяется сверху вниз, первый совпавший профиль применяется:

| Уровень | Фильтр | Пример |
|---------|--------|--------|
| L3 | IPv4/IPv6 | `--filter-ipv4`, `--filter-ipv6` |
| L4 | Протокол и порты | `--filter-tcp=443`, `--filter-udp=443` |
| L7 | Прикладной протокол | `--filter-l7=tls,quic,http,mtproto` |
| IPset | IP-диапазоны | `--ipset=/path/to/ips.txt` |
| Hostlist | Домены (SNI/Host) | `--hostlist=/path/to/hosts.txt` |

### Порядок сопоставления (matching)

1. L3 → L4 → L7 → IPset → Hostlist
2. **Первый совпавший профиль возвращается**
3. Если у профиля есть hostlist но hostname ещё неизвестен — сопоставление откладывается до парсинга L7
4. Профиль с `hostlist_auto` и известным hostname совпадает немедленно
5. Профиль без hostlist совпадает сразу после прохождения L3/L4/L7/IPset

### Кеширование профиля

После выбора профиль кешируется в connection tracking (`ctrack->dp`). Кеш сбрасывается при:
- Обнаружении L7-протокола (первый TLS ClientHello)
- Извлечении hostname (из SNI или HTTP Host)

Это запускает повторный поиск профиля с более специфичными критериями.

## Шаблоны и наследование

Шаблоны определяются через `--template` и хранятся отдельно от активных профилей:

```
--template --name=base-tls --filter-tcp=443 --filter-l7=tls --payload=tls_client_hello
--new
--import=base-tls --hostlist=/path/youtube.txt --lua-desync=multisplit:pos=1,midsld
--new
--import=base-tls --hostlist=/path/discord.txt --lua-desync=fake:blob=fake_default_tls:tcp_md5
```

`--import` копирует конфигурацию из шаблона через `dp_copy()`. Копируются **только явно установленные** значения (используются boolean-флаги `b_filter_l3`, `b_filter_l7` и т.д.).

## Цепочка Lua desync-функций

Поле `lua_desync` — связный список инстансов функций. Каждый инстанс:
- Содержит свои аргументы и параметры
- Может иметь payload-фильтр, ограничивающий выполнение
- Возвращает вердикт: `VERDICT_PASS`, `VERDICT_MODIFY`, `VERDICT_DROP`

Инстансы выполняются последовательно. Вердикты агрегируются: **DROP > MODIFY > PASS**.

```
# Два инстанса в одном профиле: сначала fake, потом split
--lua-desync=fake:blob=fake_default_tls:tcp_md5
--lua-desync=multisplit:pos=1,midsld
```

## Именование профилей

`--name=` и `--cookie=` — опциональные идентификаторы для отладки и логирования. Имена помогают в диагностике:

```
--name=youtube --filter-tcp=443 --filter-l7=tls
  --hostlist-domains=youtube.com
  --lua-desync=multisplit:pos=10:seqovl=1
```

## Типичные паттерны

### Разные стратегии для разных сервисов

```
--name=youtube --filter-tcp=443 --filter-l7=tls --payload=tls_client_hello
  --hostlist=/opt/zapret2/ipset/youtube.txt
  --lua-desync=fake:blob=fake_default_tls:tcp_md5:repeats=11
  --lua-desync=multidisorder:pos=1,midsld
--new
--name=discord --filter-udp=50000-50100 --filter-l7=quic
  --lua-desync=fake:blob=fake_default_quic:repeats=6
--new
--name=other --filter-tcp=443 --filter-l7=tls --payload=tls_client_hello
  --lua-desync=multisplit:pos=2
```

### Fallback-профиль

Последний профиль без hostlist/ipset работает как catch-all для всего остального трафика.
