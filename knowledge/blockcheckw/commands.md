---
title: blockcheckw Commands Reference
blockcheckw-version: v0.8.3
tags: blockcheckw, scan, check, universal, status, benchmark, commands
source: official-docs
created: 2026-03-25
updated: 2026-03-25
---

# Команды blockcheckw

## scan — поиск стратегий для домена

Параллельный поиск рабочих стратегий DPI bypass.

```bash
blockcheckw -w 256 scan -d rutracker.org [-p tls12] [--top 10] [--timeout 300]
```

Параметры:
- `-w N` — количество воркеров (по умолчанию определяется benchmark)
- `-d <domain>` — целевой домен
- `-p <protocol>` — протокол: `http`, `tls12`, `tls13` (по умолчанию все)
- `--top N` — показать топ-N результатов
- `--timeout N` — таймаут в секундах
- `--from-file <file>` — внешний файл со стратегиями вместо встроенных

Вывод: JSON + vanilla blockcheck2 summary формат.

## check — верификация с реальной передачей данных

Проверяет стратегии с загрузкой 32KB+ данных. Обнаруживает ~16KB DPI caps.

```bash
blockcheckw check --from-file report_vanilla.txt -d rutracker.org [--take 10] [--passes 3]
```

Параметры:
- `--from-file <file>` — файл с результатами scan (vanilla или JSON)
- `--take N` — проверить топ-N стратегий
- `--passes N` — количество проходов (по умолчанию 3)

Логика:
- Early-exit: провал → сразу отбрасывается
- Только стратегии со 100% success rate попадают в итоговый отчёт
- Включает метрики: median_latency_ms, median_speed_kbps

## universal — стратегии для нескольких доменов

Поиск стратегий, работающих на множестве доменов одновременно.

```bash
blockcheckw -w 512 universal --domain-list blocked.txt --sample 5 [-p tls12]
```

Параметры:
- `--domain-list <file>` — файл со списком доменов
- `--sample N` — выборка из списка для тестирования

Вывод: стратегии отсортированы по coverage (убывание), затем по simplicity (возрастание).

## status — проверка доступности доменов

Классификация блокировки без использования zapret2.

```bash
blockcheckw status --domain-list blocked.txt [--timeout 6]
```

Классификация:
- **available** — домен доступен прямо сейчас
- **SNI blocked** — TCP работает, TLS падает → DPI можно обойти
- **IP blocked** — TCP не работает → нужен VPN
- **DNS failed** — проблема с DNS-резолвером

Скорость: 1000+ доменов за ~30 секунд.

## benchmark — оптимизация количества воркеров

```bash
blockcheckw benchmark [-t 30] [-M 64] [-d rutracker.org] [-p tls12]
```

Тестирует 8→16→32→64→... воркеров, измеряет throughput, определяет оптимальное количество для текущего железа.

На роутерах с 256MB RAM оптимально ~64 воркеров.

## Пайплайн: scan → check

Типичный workflow:
```bash
# 1. Найти работающие стратегии
blockcheckw -w 256 scan -d rutracker.org -p tls12 --top 20 > scan_results.txt

# 2. Верифицировать с реальным трафиком
blockcheckw check --from-file scan_results.txt -d rutracker.org --take 10 --passes 3

# 3. Применить лучшую стратегию в zapret2 config
```

## Формат вывода

### Vanilla (совместим с blockcheck2.sh)
```
curl_test_https_tls12 ipv4 rutracker.org : nfqws2 --lua-desync=...
```

### JSON (scan report)
```json
{
  "domain": "rutracker.org",
  "timestamp": "2026-03-28T12:34:56",
  "total": 13943,
  "working": 45,
  "strategies": [
    {
      "protocol": "HTTPS/TLS1.2",
      "args": "--lua-desync=tcpseg:...",
      "coverage": 1
    }
  ]
}
```

### JSON (check report)
```json
{
  "strategies": [
    {
      "protocol": "HTTPS/TLS1.2",
      "args": "--lua-desync=...",
      "success_rate": 1.0,
      "median_latency_ms": 234,
      "median_speed_kbps": 512.3,
      "passes_ok": 3,
      "passes_total": 3
    }
  ]
}
```

## Ранжирование стратегий

blockcheckw ранжирует стратегии по:
1. **Coverage** (убывание) — сколько доменов покрывает
2. **Simplicity** (возрастание) — чем проще, тем лучше:
   - Меньше `--lua-desync` action → проще
   - Меньше `repeats` → проще
   - Single-stage лучше multi-stage
