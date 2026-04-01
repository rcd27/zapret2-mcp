---
title: HTTP-Specific Strategies
zapret2-version: v0.9.4.5
tags: hostcase, domcase, methodeol, http, host header
source: official-docs
created: 2026-03-25
updated: 2026-04-01
---

# HTTP-специфичные стратегии

Простейшие стратегии, работающие только для HTTP (порт 80). Не применимы к HTTPS/TLS.

## Стратегии

### hostcase
```
--hostcase
```
Меняет регистр заголовка `Host:` → `host:` (lowercase). DPI ищет точное совпадение `Host:` и пропускает изменённый заголовок. Сервер обрабатывает header case-insensitively (RFC 7230).

Lua-формат:
```
--lua-desync=http_hostcase
```
По умолчанию `spell=host` (lowercase). Можно задать произвольное написание из 4 символов: `--lua-desync=http_hostcase:spell=hOsT`.

### domcase
```
--domcase
```
Чередует регистр символов доменного имени в Host-заголовке (напр. `example.com` → `ExAmPlE.cOm`). DPI не может сопоставить домен. Чередование детерминированное — нечётные позиции uppercase, чётные lowercase.

Lua-формат:
```
--lua-desync=http_domcase
```

### methodeol
```
--methodeol
```
Вставляет `\r\n` **перед** HTTP-методом (т.е. в начало запроса), сдвигая строку запроса. Для сохранения размера пакета крадёт 2 байта из значения User-Agent. Ломает парсинг DPI, который ожидает метод в начале пакета.

## Когда использовать

HTTP — самый лёгкий протокол для bypass. Часто `--hostcase` в одиночку достаточно.

Комбинация для надёжного HTTP bypass (zapret2 lua-синтаксис):
```
--lua-desync=http_hostcase --lua-desync=multisplit:pos=method,host
```

## Ограничения

- Работают ТОЛЬКО для HTTP (порт 80)
- Бесполезны для HTTPS/TLS — заголовки зашифрованы
- Многие сайты перенаправляют HTTP → HTTPS, поэтому чисто HTTP-стратегии редко нужны в одиночку
