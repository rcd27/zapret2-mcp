---
title: TCP Segmentation Strategies
zapret2-version: v0.9.4.5
tags: split2, disorder2, multisplit, multidisorder, fakedsplit, fakeddisorder, hostfakesplit, segmentation
source: official-docs
created: 2026-03-25
updated: 2026-03-25
---

# TCP Segmentation (разбиение исходящих пакетов)

Семейство стратегий, которые разбивают TCP-сегменты на части. DPI не может собрать полный пакет и пропускает трафик.

## Базовые стратегии

### split2 / disorder2
Самые простые и надёжные. Разбивают TCP-сегмент в указанной позиции.
- **split2** — отправляет фрагменты по порядку
- **disorder2** — отправляет фрагменты в обратном порядке (сначала второй, потом первый)

disorder2 эффективнее против stateless DPI, который обрабатывает только первый пакет.

Не используют fake-пакеты — нет проблем с fooling.

### multisplit / multidisorder
Разбиение в нескольких позициях. Для DPI, который умеет пересобирать single-split сегменты.

### fakedsplit / fakeddisorder
Разбиение с вставкой fake-сегмента между реальными частями. Fake сбивает DPI-реассемблер. Требует fooling для корректной работы.

### hostfakesplit
Разбиение только на позиции Host-заголовка в HTTP. Узкоспециализированная стратегия.

## Ключевые параметры

### Позиция разбиения
```
--dpi-desync-split-pos=N
```
Специальные значения:
- `host` — начало Host/SNI заголовка
- `endhost` — конец Host/SNI заголовка
- `midsld` — середина домена второго уровня (SLD) в SNI
- Числовое значение — смещение в байтах

### Overlap TCP-последовательности
```
--dpi-desync-split-seqovl=N
```
Перекрытие TCP sequence number. Сбивает DPI, который отслеживает последовательности. Требует `--dpi-desync-split-pos` > N.

### Разбиение HTTP-запроса
```
--dpi-desync-split-http-req=method+host
```
Разбивает HTTP-запрос на границах method и host.

## Lua-формат (nfqws2 v0.9+)

В новых версиях zapret2 стратегии задаются через Lua:
```
--lua-desync=multisplit:pos=method+2,midsld
--lua-desync=multidisorder:pos=1,midsld:seqovl=2
```

Параметры через `:` разделитель:
- `pos=<позиции>` — позиции разбиения через запятую
- `seqovl=<N>` — overlap последовательности
- `seqovl_pattern=<blob>` — паттерн для overlap

## Примеры

Простейший bypass для TLS 1.3:
```
--dpi-desync=split2 --dpi-desync-split-pos=host
```

Для stateful DPI:
```
--dpi-desync=split2 --dpi-desync-split-pos=host --dpi-desync-split-seqovl=1
```

Multi-split для продвинутого DPI:
```
--lua-desync=multisplit:pos=1,midsld
```

## Когда использовать

- **split2** — первое, что стоит попробовать. Простейшая и самая надёжная стратегия.
- **disorder2** — если split2 не работает. Полезна против stateless DPI.
- **multisplit** — если DPI умеет пересобирать single-split.
- **fakedsplit** — если segmentation без fakes не помогает. Требует правильный fooling.
