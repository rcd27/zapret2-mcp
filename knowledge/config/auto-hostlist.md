---
title: Auto-Hostlist and Failure Detection
zapret2-version: v0.9.4.5
tags: auto-hostlist, failure detection, retransmission, rst, redirect, autohostlist, blocking detection
source: deepwiki/bol-van/zapret2, official-docs
created: 2026-03-28
updated: 2026-03-28
---

# Авто-хостлист и детекция отказов

Автоматическое обнаружение заблокированных доменов по паттернам сбоев соединений. Домены, которые повторно не загружаются, автоматически добавляются в хостлист для применения DPI bypass.

## Принцип работы

1. Демон мониторит сетевые соединения на признаки DPI-блокировки
2. При обнаружении сбоя увеличивает счётчик для данного домена
3. При достижении порога — домен записывается в файл auto-hostlist
4. С этого момента к домену применяется стратегия обхода

## Механизмы детекции (C-side)

Встроенная детекция активна когда у профиля настроен `hostlist_auto`:

| Тип сбоя | Направление | Как определяется |
|----------|-------------|-----------------|
| TCP Retransmission | Исходящий | Sequence number ≤ ранее отслеженной позиции |
| Incoming RST | Входящий | RST-флаг в пределах `hostlist_auto_incoming_maxseq` |
| HTTP Redirect | Входящий | DPI-редирект (домен в Location не совпадает с оригиналом) |
| UDP Timeout | Оба | Исходящих ≥ порога И входящих ≤ порога |

### Детекция TCP-ретрансмиссий

Функция `is_retransmission()` сравнивает sequence текущего пакета с отслеженной позицией (`ctrack->pos.client.tcp.uppos_prev`). Когда `req_retrans_counter` достигает `hostlist_auto_retrans_threshold` — вызывается `auto_hostlist_failed()`.

Опционально: `hostlist_auto_retrans_reset` — отправка spoofed RST для сброса цикла ретрансмиссий.

### Детекция HTTP-редиректов

`is_dpi_redirect()` сравнивает домен из заголовка `Location` с оригинальным hostname. Если домены не совпадают — это DPI-редирект.

## Lua-based детекция

`standard_failure_detector` в `zapret-auto.lua` зеркалит C-логику со скриптовыми порогами:
- RST-детекция: проверка TCP reset flag в диапазоне `inseq`
- HTTP-редирект: через `is_dpi_redirect()`
- UDP failure: порог исходящих при отсутствии входящих

## Управление состоянием

### Host Records (`hrec`)
Постоянные счётчики и текущий индекс стратегии для каждого домена.

### Connection Records (`crec`)
Счётчики ретрансмиссий и защита от дубликатов для каждого соединения.

### Failure Pool (`hostfail_pool`)
In-memory linked list доменов, ожидающих добавления в хостлист. Каждая запись имеет expiration time для предотвращения застревания.

### Сброс по таймауту

`automate_failure_counter()` управляет инкрементом счётчиков с time-based reset. Если интервал между сбоями превышает `maxtime` — счётчик сбрасывается в ноль.

## Процесс добавления в хостлист

1. **Purge**: `HostFailPoolPurge()` — удаление просроченных записей
2. **Find/Add**: поиск или создание записи в failure pool
3. **Threshold**: `counter >= hostlist_auto_fail_threshold` → обработка
4. **Duplicate check**: `HostlistCheck()` — домен не должен уже быть в активных хостлистах
5. **Persist**: `append_to_list_file()` — запись домена в файл `--hostlist-auto`
6. **In-memory update**: `HostlistPoolAddStrLen()` — немедленное обновление активного пула

## Параметры конфигурации

| Параметр CLI | Описание | По умолчанию |
|-------------|----------|-------------|
| `--hostlist-auto=<file>` | Путь к файлу auto-hostlist | — |
| `--hostlist-auto-fail-threshold=<N>` | Количество сбоев для добавления | 3 |
| `--hostlist-auto-fail-time=<sec>` | Временное окно для подсчёта сбоев | 60 |
| `--hostlist-auto-retrans-threshold=<N>` | Порог TCP-ретрансмиссий | 3 |
| `--hostlist-auto-retrans-reset` | Отправка RST для сброса ретрансмиссий | off |

## Пример использования

```
--name=auto-detect --filter-tcp=443 --filter-l7=tls
  --payload=tls_client_hello
  --hostlist-auto=/opt/zapret2/ipset/auto-blocked.txt
  --hostlist-auto-fail-threshold=3
  --hostlist-auto-fail-time=60
  --lua-desync=fake:blob=fake_default_tls:tcp_md5
  --lua-desync=multisplit:pos=1,midsld
```

При таком конфиге:
- Все TLS-соединения на порт 443 мониторятся на сбои
- После 3 сбоев за 60 секунд домен добавляется в `auto-blocked.txt`
- Стратегия `fake + multisplit` применяется к доменам из списка

## Интеграция со стратегией ротации

Auto-hostlist работает совместно с circular strategy (см. `orchestration.md`):
- `circular` ротирует стратегии при сбоях
- `standard_failure_detector` определяет сбои для ротации
- Если все стратегии исчерпаны — домен считается полностью заблокированным

## Флаг финализации

`ctrack->failure_detect_finalized` предотвращает повторную детекцию после того, как исход соединения определён окончательно. Это оптимизация для долгоживущих потоков.
