---
title: Блобы (blobs) — бинарные данные для fake-пакетов
zapret2-version: v0.9.4.5
tags: blob, fake, tls_mod, fake_default_tls, fake_default_http, fake_default_quic, бинарные данные
created: 2026-03-29
updated: 2026-03-29
source: community
---

# Блобы (Blobs) в Zapret2

**Блоб (blob)** — это переменная Lua типа `string`, содержащая блок **двоичных данных** произвольной длины (от 1 байта до гигабайтов). Блобы используются для хранения fake-пакетов и других бинарных данных.

---

## 📦 **Стандартные блобы**

nfqws2 автоматически инициализирует **3 стандартных блоба** при запуске:

### 1. **`fake_default_tls`** (680 байт)

**Что это:** TLS Client Hello пакет с SNI `www.microsoft.com`

**Содержимое:**
- TLS версия: 1.2/1.3
- Cipher suites: современные шифры
- SNI: `www.microsoft.com` (по умолчанию)
- Поддержка HTTP/2
- Расширения: supported_groups, signature_algorithms, key_share и др.

**Использование:**
```bash
--payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls
```

### 2. **`fake_default_http`** (227 байт)

**Что это:** HTTP GET запрос

**Содержимое:**
```http
GET / HTTP/1.1
Host: www.iana.org
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8
Accept-Encoding: gzip, deflate, br
```

**Использование:**
```bash
--payload=http_req --lua-desync=fake:blob=fake_default_http
```

### 3. **`fake_default_quic`** (620 байт)

**Что это:** QUIC Initial пакет (минимальный валидный пакет)

**Содержимое:**
- Первый байт: `0x40` (QUIC long header)
- Остальное: нули (620 байт всего)

**Использование:**
```bash
--payload=quic_initial --lua-desync=fake:blob=fake_default_quic
```

---

## 🔧 **Модификации TLS блоба (`tls_mod`)**

Функция **`tls_mod(blob, modlist, payload)`** модифицирует TLS Client Hello.

### Доступные модификации:

#### 1. **`rnd`** - Рандомизация поля "random"
- Заменяет 32-байтовое поле "random" в TLS handshake на случайные данные
- Делает каждый fake-пакет уникальным

#### 2. **`rndsni`** - Случайный SNI
- Генерирует случайное доменное имя
- Заменяет SNI в TLS расширении
- Пример: `www.microsoft.com` → `a7b3c.com`

#### 3. **`sni=<домен>`** - Установить конкретный SNI
- Заменяет SNI на указанный домен
- Пример: `sni=www.google.com`

#### 4. **`dupsid`** - Дублировать Session ID
- Копирует Session ID из **реального** TLS handshake (из `payload`)
- Требует третий параметр — реальный payload пакета
- Делает fake более похожим на настоящий

#### 5. **`padencap`** - Padding encapsulation
- Добавляет padding в TLS расширения
- Увеличивает размер пакета

#### 6. **`none`** - Без модификаций
- Явно указывает, что модификации не нужны

---

## 💡 **Примеры использования**

### Базовое использование стандартных блобов:

```bash
# TLS fake без модификаций
--lua-desync=fake:blob=fake_default_tls

# HTTP fake
--lua-desync=fake:blob=fake_default_http

# QUIC fake
--lua-desync=fake:blob=fake_default_quic
```

### Модификация TLS при старте:

```bash
# Однократно при старте изменить SNI на случайный и рандомизировать поле random
--lua-init="fake_default_tls = tls_mod(fake_default_tls,'rnd,rndsni')"
```

### Модификация TLS на лету:

```bash
# При каждой отправке менять SNI на google.com и копировать session ID
--lua-desync=fake:blob=fake_default_tls:tls_mod=rnd,dupsid,sni=www.google.com
```

### Комбинированные примеры:

```bash
# Для YouTube: fake с google.com SNI, MD5 signature, 11 повторов
--payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:tcp_md5:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com
```

### Создание собственных блобов:

```bash
# Загрузить blob из hex-строки
--blob=myblob:0x1603010000

# Загрузить blob из файла
--blob=custom_tls:@/path/to/tls_clienthello.bin

# Загрузить с offset
--blob=custom_tls:+100@/path/to/file.bin

# Использовать свой blob
--lua-desync=fake:blob=myblob
```

---

## 🔍 **Как работает `tls_mod`**

### Синтаксис:
```lua
tls_mod(blob, modlist, [payload])
```

**Параметры:**
1. `blob` - исходный TLS Client Hello (строка с бинарными данными)
2. `modlist` - список модификаций через запятую
3. `payload` (опционально) - реальный TLS handshake для копирования Session ID

**Возвращает:** модифицированный TLS Client Hello

### Примеры в Lua:

```lua
-- При старте программы
fake_default_tls = tls_mod(fake_default_tls, 'rnd,rndsni')

-- В desync функции с реальным payload
fake_payload = tls_mod(fake_default_tls, 'dupsid,sni=www.google.com', desync.reasm_data)
```

---

## 📋 **Полный пример конфигурации**

```bash
nfqws2 \
  --lua-init=@zapret-lib.lua --lua-init=@zapret-antidpi.lua \
  --lua-init="fake_default_tls = tls_mod(fake_default_tls,'rnd,rndsni')" \
  --blob=quic_google:@quic_initial_www_google_com.bin \
  \
  --filter-tcp=80 --filter-l7=http \
  --payload=http_req --lua-desync=fake:blob=fake_default_http:tcp_md5 \
  --lua-desync=multisplit:pos=method+2 \
  --new \
  \
  --filter-tcp=443 --filter-l7=tls \
  --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:tcp_md5:repeats=6 \
  --lua-desync=multidisorder:pos=1,midsld \
  --new \
  \
  --filter-udp=443 --filter-l7=quic \
  --payload=quic_initial --lua-desync=fake:blob=quic_google:repeats=11
```

---

## 🎯 **Ключевые моменты**

1. **Стандартные блобы** инициализируются автоматически — не нужно их загружать
2. **`fake_default_tls`** содержит SNI `www.microsoft.com` по умолчанию
3. **`tls_mod`** может применяться:
   - **Один раз при старте** через `--lua-init`
   - **На лету** при каждой отправке через параметр `tls_mod=` в desync функции
4. **`dupsid`** требует реальный payload — работает только в функциях `fake`, `syndata` и подобных
5. **Модификации комбинируются** через запятую: `rnd,rndsni,dupsid,sni=domain.com`

Блобы — это мощный механизм для создания fake-пакетов любой сложности без жестко зашитых параметров в коде программы!

---
