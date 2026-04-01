---
title: Find Bypass Strategy Workflow
zapret2-version: v0.9.4.5
blockcheckw-version: v0.8.3
tags: strategy, blockcheckw, scan, check, bypass, workflow
source: official-docs
created: 2026-03-25
updated: 2026-04-01
---

# Поиск рабочей стратегии DPI bypass

## Рекомендуемый workflow (через blockcheckw)

### 1. Проверить тип блокировки
```bash
blockcheckw status --domain-list domains.txt
```
Если домен IP blocked — VPN, zapret2 не поможет.
Если SNI blocked — продолжаем.

### 2. Остановить zapret2 (если запущен)
blockcheckw сам останавливает сервис перед сканированием и восстанавливает после.

### 3. (Опционально) Определить оптимальное число воркеров
```bash
blockcheckw benchmark -d rutracker.org
```

### 4. Сканировать стратегии
```bash
blockcheckw -w 256 scan -d rutracker.org --top 20
```
~2 минуты. Тестирует 13,943 встроенных стратегий параллельно.

### 5. Верифицировать лучшие стратегии
```bash
blockcheckw check --from-file scan_results.txt -d rutracker.org --take 10 --passes 3
```
Проверка с реальной передачей данных (32KB+). Отсеивает стратегии с ~16KB DPI cap.

### 6. Применить стратегию
Взять лучшую стратегию из вывода check и записать в конфиг:
```bash
# Если стратегия: --lua-desync=tcpseg:pos=0,1:ip_id=rnd
# Записать в NFQWS2_OPT в /opt/zapret2/config
```

### 7. Перезапустить сервис и проверить

## Выбор стратегии: критерии (в порядке приоритета)

1. **Стабильность** — избегать стратегий с хрупкими TTL-трюками (фиксированный ip_ttl). Предпочитать ip_autottl или non-TTL fooling.
2. **Простота** — меньше параметров = надёжнее. Предпочитать `multisplit` перед сложными multi-strategy цепочками.
3. **Покрытие протоколов** — если домен использует HTTPS и HTTP, стратегия должна покрывать оба.
4. **TLS-версия** — TLS 1.3 легче (меньше метаданных). TLS 1.2 может требовать обработку server response.

## Приоритет стратегий

1. `multisplit` или `multidisorder` — TCP segmentation без fakes, самый простой вариант
2. `fakedsplit` / `fakeddisorder` с `tcp_md5` или `badsum` fooling — надёжное удаление fakes
3. `multisplit` / `multidisorder` с несколькими `pos` — для DPI, который пересобирает single-split
4. Избегать стратегий, основанных только на `ip_ttl` — TTL зависит от маршрута, предпочитать `ip_autottl`

## Resilience

Для устойчивости к обновлениям DPI используй circular orchestrator из `zapret-auto.lua`:
```
--lua-desync=circular
--lua-desync=<стратегия1>:strategy=1
--lua-desync=<стратегия2>:strategy=2
--lua-desync=<стратегия3>:strategy=3
```
nfqws2 циклически переключается между пронумерованными стратегиями при обнаружении сбоев (порог задаётся через `fails=N`).

## Конструирование NFQWS2_OPT из результатов

Из вывода blockcheckw берём стратегию и обрамляем фильтрами:
```bash
NFQWS2_OPT="
--filter-tcp=443 --filter-l7=tls
  <стратегия из blockcheckw>
"
```

Для multi-protocol (HTTP + TLS + QUIC) создаём отдельные профили через `--new`.
