---
title: HTTP-Specific Strategies
zapret2-version: v0.9.4.5
tags: hostcase, domcase, methodeol, http, host header
---

# HTTP-специфичные стратегии

Простейшие стратегии, работающие только для HTTP (порт 80). Не применимы к HTTPS/TLS.

## Стратегии

### hostcase
```
--hostcase
```
Меняет регистр заголовка Host: (например, `Host:` → `hOsT:`). DPI ищет точное совпадение `Host:` и пропускает изменённый заголовок. Сервер обрабатывает header case-insensitively.

Lua-формат:
```
--lua-desync=http_hostcase:spell=hOsT
```

### domcase
```
--domcase
```
Рандомизирует регистр доменного имени в Host-заголовке. DPI не может сопоставить домен.

Lua-формат:
```
--lua-desync=http_domcase
```

### methodeol
```
--methodeol
```
Добавляет дополнительный перевод строки после HTTP-метода. Ломает парсинг DPI.

## Когда использовать

HTTP — самый лёгкий протокол для bypass. Часто `--hostcase` в одиночку достаточно.

Комбинация для надёжного HTTP bypass:
```
--hostcase --dpi-desync=split2 --dpi-desync-split-http-req=method+host
```

## Ограничения

- Работают ТОЛЬКО для HTTP (порт 80)
- Бесполезны для HTTPS/TLS — заголовки зашифрованы
- Многие сайты перенаправляют HTTP → HTTPS, поэтому чисто HTTP-стратегии редко нужны в одиночку
