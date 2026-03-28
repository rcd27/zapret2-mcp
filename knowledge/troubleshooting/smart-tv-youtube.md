---
title: Smart TV и YouTube — диагностика и решения
zapret2-version: v0.9.4.5
tags: troubleshooting, smart-tv, youtube, tls, samsung, tizen, lg, webos, vidaa, platforms
source: community
created: 2026-03-28
updated: 2026-03-28
---

# Smart TV и YouTube: почему стратегия работает на ПК, но не на телевизоре

## Корневая причина: TLS 1.2 vs TLS 1.3

Smart TV используют **TLS 1.2**, в то время как ПК, мобилки и Android TV приставки используют **TLS 1.3**. DPI обрабатывает эти версии по-разному, поэтому стратегия, работающая на компьютере, может не работать на телевизоре.

| Платформа | TLS версия | Совместимость с zapret2 |
|---|---|---|
| ПК (браузеры) | 1.3 | Высокая — работает почти всегда |
| Android (приложения) | 1.3 | Высокая |
| iPhone/iPad | 1.3 | Высокая |
| Android TV (SmartTube) | 1.3 | Высокая |
| LG WebOS | **1.2** | Низкая — нужна стратегия под TLS 1.2 |
| Samsung Tizen | **1.2** | Очень низкая — самая проблемная платформа |
| Hisense VIDAA | **1.2** | Низкая — аналогично WebOS |
| Яндекс ТВ Станция | 1.2/1.3 | Средняя — есть рабочие lua-desync стратегии |

## Диагностика

### Проверка работы TLS 1.2 на роутере

```bash
# Если ТВ не работает, проверяем TLS 1.2 с роутера:
curl --tlsv1.2 --tls-max 1.2 -I https://youtube.com
# Ожидаемый ответ: HTTP/2 301

curl --tlsv1.2 --tls-max 1.2 -I https://www.youtube.com
# Ожидаемый ответ: HTTP/2 200

# Если "curl: (28) SSL connection timeout" — стратегия НЕ работает для TLS 1.2
```

### Проверка через blockcheck2

При подборе стратегии для ТВ тестировать нужно именно `curl_test_https_tls12`, а **не** `curl_test_https_tls13`. Если blockcheck2 показывает AVAILABLE только для TLS 1.3 — стратегия на ТВ не заработает.

### Кеширование на ТВ

VIDAA, WebOS и Tizen агрессивно кешируют приложение YouTube и DNS-запросы. После смены стратегии для проверки необходимо:

1. **Выдернуть ТВ из розетки** (не просто выключить пультом)
2. Подождать 10-15 секунд
3. Включить обратно
4. Запустить YouTube

Без этого шага ТВ может использовать кешированные данные и старое соединение.

## Проблемы по платформам

### Samsung Tizen

Самая проблемная платформа. Особенности:
- При открытии YouTube приложение сначала обращается к **серверам авторизации Samsung**, затем к Google/YouTube
- Эти промежуточные запросы тоже могут попадать под DPI
- На ТВ невозможно установить диагностические инструменты
- Нельзя заменить приложение YouTube на альтернативное (нет SmartTube для Tizen)

### LG WebOS

- Использует TLS 1.2
- Стратегии под TLS 1.3 не работают
- Есть успешные кейсы с правильно подобранной стратегией

### Hisense VIDAA

- Близка к WebOS по поведению
- TLS 1.2
- Агрессивное кеширование — обязательно выдёргивать из розетки

## Решения

### 1. Подбор стратегии специально под TLS 1.2

При запуске blockcheck2 убедиться, что стратегия проходит тест `curl_test_https_tls12`. Пример вывода, который означает что стратегия подойдёт для ТВ:

```
- curl_test_https_tls12 ipv4 www.youtube.com : nfqws2 --payload=tls_client_hello --lua-desync=multidisorder:pos=1,sniext+1,host+1,midsld-2,midsld,midsld+2,endhost-1
!!!!! AVAILABLE !!!!!
```

### 2. Агрессивная multidisorder стратегия (community)

Стратегия, показавшая широкую совместимость с ТВ (zapret2 lua-синтаксис):

```
--out-range=-s34228
--payload=tls_client_hello
--lua-desync=multidisorder:pos=1,sniext+1,host+1,midsld-2,midsld,midsld+2,endhost-1
--lua-desync=fake:blob=blob_tls_clienthello_www_google_com:optional:tcp_seq=-10000:tcp_ack=-66000:badsum:tls_mod=rnd,dupsid,sni=rzd.ru:repeat=4
```

Принцип работы:
1. **fake-инстанс** — отправляет фейковый ClientHello с битой checksum (badsum) и смещёнными TCP-параметрами. DPI "залипает" на ложном потоке, сервер пакет отбрасывает.
2. **multidisorder-инстанс** — ломает реальный ClientHello в 7 позициях (начало пакета, SNI extension, hostname, три точки в mid-SLD, конец hostname). DPI не может извлечь SNI и JA3 fingerprint.

⚠️ Это community-стратегия, не универсальное решение. Результат зависит от провайдера и региона. Всегда рекомендуется подбирать стратегию через blockcheck2/blockcheckw.

### 3. Разделение стратегий по секциям

Для максимальной совместимости рекомендуется разделять стратегии через `--new`:

```
NFQWS2_OPT="
--name=youtube-tv
  --filter-tcp=443 --filter-l7=tls
  --payload=tls_client_hello
  --hostlist-domains=youtube.com,googlevideo.com,youtubei.googleapis.com
  --lua-desync=multidisorder:pos=1,sniext+1,host+1,midsld-2,midsld,midsld+2,endhost-1
  --lua-desync=fake:blob=blob_tls_clienthello_www_google_com:optional:tcp_seq=-10000:tcp_ack=-66000:badsum:tls_mod=rnd,dupsid,sni=rzd.ru:repeat=4
--new
--name=other-https
  --filter-tcp=443 --filter-l7=tls
  --payload=tls_client_hello
  --lua-desync=multisplit:blob=fake_default_tls:tcp_ts=-1000:pos=2:nodrop
"
```

Первая секция — агрессивная стратегия для YouTube (покрывает и TLS 1.2, и 1.3). Вторая — более мягкая для остальных сайтов.

### 4. Радикальное решение: Android TV приставка

Если ничего не помогает на Samsung Tizen — наиболее надёжное решение:

1. Купить Android TV приставку (Xiaomi Mi Box, любая на Android TV)
2. Установить SmartTube (альтернативный клиент YouTube)
3. SmartTube использует TLS 1.3 → работает с большинством стратегий zapret2

На Android TV с SmartTube zapret2 часто работает даже с дефолтной стратегией.

## Чеклист: YouTube не работает на ТВ

1. [ ] Проверить TLS 1.2: `curl --tlsv1.2 --tls-max 1.2 -I https://www.youtube.com`
2. [ ] Если timeout — текущая стратегия не работает для TLS 1.2
3. [ ] Запустить blockcheck2, смотреть результаты `curl_test_https_tls12`
4. [ ] Попробовать агрессивную multidisorder стратегию (см. выше)
5. [ ] Выдернуть ТВ из розетки перед каждой проверкой
6. [ ] Если Samsung Tizen — рассмотреть Android TV приставку как альтернативу
7. [ ] Проверить что Private DNS на устройствах выключен (может мешать на Android)
