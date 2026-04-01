---
title: TCP Segmentation Strategies
zapret2-version: v0.9.4.5
tags: split2, disorder2, multisplit, multidisorder, fakedsplit, fakeddisorder, hostfakesplit, segmentation
source: official-docs
created: 2026-03-25
updated: 2026-04-01
---

# TCP Segmentation (разбиение исходящих пакетов)

Семейство стратегий, которые разбивают TCP-сегменты на части. DPI не может собрать полный пакет и пропускает трафик.

## Базовые стратегии

### multisplit / multidisorder (ранее split2 / disorder2)
Самые простые и надёжные. Разбивают TCP-сегмент в указанных позициях.
- **multisplit** — отправляет фрагменты по порядку
- **multidisorder** — отправляет фрагменты в обратном порядке (от последнего к первому)

> В zapret v1 эти стратегии назывались `split2` и `disorder2`. С версии v69 они стали алиасами для `multisplit`/`multidisorder`. В zapret2 используются только имена `multisplit`/`multidisorder`.

multidisorder эффективнее против stateless DPI, который обрабатывает только первый пакет.

Не используют fake-пакеты — нет проблем с fooling.

### fakedsplit / fakeddisorder
Разбиение с вставкой fake-сегмента между реальными частями. Fake сбивает DPI-реассемблер. Требует fooling для корректной работы.

### hostfakesplit
Разбиение на позиции hostname в TCP-протоколах, содержащих имя хоста: **HTTP (Host-заголовок) и TLS (SNI в ClientHello)**. Вставляет fake-сегменты между частями hostname, затрудняя DPI различение реального и фейкового имени. Требует fooling.

## Ключевые параметры

### Позиция разбиения
```
--dpi-desync-split-pos=N
```
Специальные значения (маркеры позиций):
- `method` — начало HTTP-метода (GET, POST и т.д.)
- `host` — начало Host/SNI заголовка
- `endhost` — конец Host/SNI заголовка
- `sld` — начало домена второго уровня (SLD)
- `endsld` — конец SLD
- `midsld` — середина SLD
- `sniext` — начало SNI extension в TLS ClientHello
- Числовое значение — смещение в байтах
- Поддерживается арифметика: `host+1`, `midsld-2`, `sniext+1`

### Overlap TCP-последовательности
```
--dpi-desync-split-seqovl=N
```
Перекрытие TCP sequence number. Сбивает DPI, который отслеживает последовательности. Требует `--dpi-desync-split-pos` > N.

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

Простейший bypass для TLS 1.3 (zapret2 lua-синтаксис):
```
--lua-desync=multisplit:pos=host
```

Для stateful DPI (с overlap):
```
--lua-desync=multisplit:pos=host:seqovl=1
```

Multi-split для продвинутого DPI:
```
--lua-desync=multisplit:pos=1,midsld
```

Обратный порядок для stateless DPI:
```
--lua-desync=multidisorder:pos=1,midsld:seqovl=2
```

## Когда использовать

- **multisplit** — первое, что стоит попробовать. Простейшая и самая надёжная стратегия.
- **multidisorder** — если multisplit не работает. Полезна против stateless DPI.
- **multisplit с несколькими pos** — если DPI умеет пересобирать single-split (напр. `pos=1,midsld`).
- **fakedsplit** — если segmentation без fakes не помогает. Требует правильный fooling.
