---
title: MTProto — обнаружение и обход блокировки Telegram
zapret2-version: v0.9.4.5
tags: mtproto, telegram, detection, filter-l7, ipset, шифрование
created: 2026-03-29
updated: 2026-04-15
source: community
---

**Zapret действительно распознаёт MTProto**:

```c 32:32:nfq2/protocol.c
static const char *l7proto_name[] = {"all","unknown","known","http","tls","quic","wireguard","dht","discord","stun","xmpp","dns","mtproto"};
```

```c 54:54:nfq2/protocol.c
 "mtproto_initial"};
```

## Как работает определение MTProto

```c 1423:1445:nfq2/protocol.c
bool IsMTProto(const uint8_t *data, size_t len)
{
	if (len>=64)
	{
		// this way requires only one AES instead of 4
		uint8_t decrypt[16], iv[16];
		aes_context ctx;

		memcpy(iv, data+40, 16);
		ctr_add(iv,3);
		if (!aes_setkey(&ctx, AES_ENCRYPT, data+8, 32) && !aes_cipher(&ctx, iv, decrypt))
		{
			*((uint32_t*)(decrypt+8)) ^= *((uint32_t*)(data+56));
			return !memcmp(decrypt+8,"\xEF\xEF\xEF\xEF",4);  // сигнатура MTProto2
		}
	}
	return false;
}
```

Определяется через **AES дешифровку** — проверяется магическая сигнатура `0xEFEFEFEF`.

## Ограничения

```c 1243:1252:nfq2/desync.c
		else if (ctrack && (ctrack->pos.seq_last - ctrack->pos.seq0)==1 && IsMTProto(dis->data_payload, dis->len_payload))
		{
			DLOG("packet contains telegram mtproto2 initial\n");
			// mtproto detection requires aes. react only on the first tcp data packet. do not detect if ctrack unavailable.
			l7payload = L7P_MTPROTO_INITIAL;
```

1. Определяется **только на первом TCP пакете с данными**
2. Требуется **conntrack** (ctrack)
3. Последующие пакеты будут **unknown**

## Важно для фильтрации!

**MTProto НЕ содержит hostname!** Это значит:

| Фильтрация                  | Работает?                |
|-----------------------------|--------------------------|
| `--filter-l7=mtproto`       | ✅ Да                     |
| `--payload=mtproto_initial` | ✅ Да                     |
| `--hostlist=...`            | ❌ **Нет** (нет hostname) |
| `--ipset=telegram_ips.txt`  | ✅ Да                     |

## Пример использования

```bash
nfqws2 --lua-init=@zapret-lib.lua --lua-init=@zapret-antidpi.lua \
  --filter-l7=mtproto \
  --payload=mtproto_initial \
  --lua-desync=fake:blob=0x00000000:repeats=3
```

Или с ipset для большей точности:

```bash
nfqws2 \
  --ipset=telegram_ips.txt \
  --filter-l7=mtproto \
  --payload=mtproto_initial \
  --lua-desync=multisplit:pos=32
```

hostlist бесполезен — только ipset или фильтрация по l7 proto.

Ключевое условие в коде:

```c 1243:1252:nfq2/desync.c
		else if (ctrack && (ctrack->pos.seq_last - ctrack->pos.seq0)==1 && IsMTProto(dis->data_payload, dis->len_payload))
		{
			DLOG("packet contains telegram mtproto2 initial\n");
			// mtproto detection requires aes. react only on the first tcp data packet. do not detect if ctrack unavailable.
			l7payload = L7P_MTPROTO_INITIAL;
			if (l7proto == L7_UNKNOWN)
			{
				l7proto = L7_MTPROTO;
				if (ctrack->l7proto == L7_UNKNOWN) ctrack->l7proto = l7proto;
			}
		}
```

## Когда MTProto → unknown

**Условие детекции:**

```c
(ctrack->pos.seq_last - ctrack->pos.seq0) == 1
```

Это значит: **только первый TCP пакет с данными**.

```
TCP соединение MTProto:
────────────────────────────────────────────────────────────►

[SYN]     [SYN+ACK]     [ACK]     [DATA #1]          [DATA #2]     [DATA #3] ...
  │           │           │           │                  │             │
  │           │           │           │                  │             │
  │           │           │           └── seq_last-seq0=1  └─────────────┴── seq_last-seq0 > 1
  │           │           │               payload=mtproto_initial         payload=unknown
  │           │           │               proto=mtproto                   proto=mtproto (сохранён)
  │           │           │
  └───────────┴───────────┴── payload=empty
```

## Разница l7proto vs payload

| Пакет                   | `--filter-l7` (proto) | `--payload`         |
|-------------------------|-----------------------|---------------------|
| SYN, SYN+ACK, ACK       | unknown               | empty               |
| **1-й пакет с данными** | **mtproto**           | **mtproto_initial** |
| 2-й пакет с данными     | mtproto               | **unknown**         |
| 3-й пакет с данными     | mtproto               | **unknown**         |
| ...                     | mtproto               | **unknown**         |

**l7proto** (протокол соединения) сохраняется в conntrack и остаётся `mtproto` для всего соединения.

**payload** (тип содержимого пакета) — `mtproto_initial` только для первого пакета, потом `unknown`.

## Практический вывод

```bash
# Сработает только на первом пакете с данными
--filter-l7=mtproto --payload=mtproto_initial --lua-desync=fake

# Сработает на всех пакетах MTProto соединения (включая unknown)
--filter-l7=mtproto --payload=all --lua-desync=multisplit

# Или без фильтра payload (по умолчанию known, mtproto_initial входит)
--filter-l7=mtproto --lua-desync=fake
```

**Да, можно!** Множественные payload поддерживаются через запятую:

```c 953:963:nfq2/nfqws.c
static bool parse_l7p_list(char *opt, uint64_t *l7p)
{
	char *e, *p, c;
	t_l7payload payload;

	for (p = opt, *l7p = 0; p; )
	{
		if ((e = strchr(p, ',')))  // парсинг через запятую
		{
			c = *e;
			*e = 0;
```

## Правильный синтаксис

```bash
--payload=mtproto_initial,unknown
```

Это сработает на:

- Первом пакете MTProto (`mtproto_initial`)
- Всех последующих пакетах (`unknown`)

## Пример для MTProto

```bash
nfqws2 \
  --filter-l7=mtproto \
  --payload=mtproto_initial,unknown \
  --lua-desync=fake:blob=0x00000000:repeats=2
```

Или если нужны разные стратегии для разных payload:

```bash
nfqws2 \
  --filter-l7=mtproto \
  --payload=mtproto_initial \
    --lua-desync=fake:blob=0x00000000:repeats=3 \
  --payload=unknown \
    --lua-desync=multisplit:pos=16
```

## Доступные payload типы

Из кода `protocol.c`:

```
empty, http_req, http_resp, tls_client_hello, tls_server_hello, 
tls_app_data, quic_initial, quic_0rtt, wireguard_initiation, 
wireguard_response, wireguard_cookie, dht, discord_ip_discovery, 
stun, xmpp_stream, xmpp_starttls, dns_req, dns_resp, mtproto_initial,
unknown, known, all
```

## Лучший подход для MTProto для обхода блокировок

**Только первый пакет имеет значение!** Вот почему:

### Как DPI детектит MTProto

1. **По первому пакету** — есть характерная структура (64+ байт, AES сигнатура)
2. **По IP серверов** — известные диапазоны Telegram
3. После установления соединения — всё зашифровано, DPI не видит ничего

### Рекомендация

```bash
nfqws2 \
  --filter-l7=mtproto \
  --payload=mtproto_initial \
  --lua-desync=fake:blob=0x00000000000000000000000000000000:repeats=3
```

**Почему так:**

| Вариант                           | Плюсы                           | Минусы                                 |
|-----------------------------------|---------------------------------|----------------------------------------|
| `payload=mtproto_initial`         | Минимум нагрузки, точно по цели | —                                      |
| `payload=mtproto_initial,unknown` | Охватывает всё                  | Лишняя обработка зашифрованных пакетов |
| `payload=all`                     | Проще написать                  | Обрабатывает даже пустые ACK           |

### Почему unknown не нужен

После первого пакета MTProto2:

- Трафик **полностью зашифрован**
- Выглядит как **случайные данные**
- DPI **не может** его отличить от обычного шума
- Обработка = **пустая трата CPU**

### Если блокируют жёстко

Если DPI анализирует паттерны (размеры, тайминги), можно добавить:

```bash
nfqws2 \
  --filter-l7=mtproto \
  --payload=mtproto_initial \
  --lua-desync=fake:blob=0x00000000000000000000000000000000:repeats=3 \
  --lua-desync=multisplit:pos=32
```

### Если блокируют по IP

Тут только VPN/proxy поможет, или использовать MTProxy с obfuscation.

---

**TL;DR:** Используй `--payload=mtproto_initial` — этого достаточно в 99% случаев.

## Не используйте TLS

Telegram API (api.telegram.org) использует обычный HTTPS/TLS, поэтому is_valid_tls_client_hello корректно определяет его
как TLS. Но:

1. seqovl с подменой SNI ломает соединение с Telegram - серверы Telegram могут проверять SNI или не поддерживать TCP
   overlap
2. Пакет дропается (drop) после отправки модифицированных частей, но сервер не принимает их

payload_check(desync) пропускает трафик если в конфиге payload=known (все известные типы)

Для non-TLS fallback по умолчанию = "pattern" → применяется seqovl с raw TLS blob → ломает MTProto и другие протоколы

MTProto не TLS, функция это видит, но fallback=pattern всё равно добавляет TLS blob перед MTProto пакетом → сервер
Telegram не понимает такой мусор → соединение разрывается.

## Глобальный фильтр

Давайте посмотрим, какие фильтры (--wf) поддерживаются в zapret и как они работают с MTProto.

[10 tools called]

Отличные вопросы! Давайте разберёмся:

## Захват MTProto пакетов

Для MTProto **нельзя создать простой WinDivert фильтр** по пейлоаду, потому что детекция MTProto требует **AES
расшифровки**:

```1423:1445:nfq2/protocol.c
bool IsMTProto(const uint8_t *data, size_t len)
{
	if (len>=64)
	{
/*
		uint8_t decrypt[64];
		aes_ctr_crypt(data+8, 32, data+40, data, 64, decrypt);
		return !memcmp(decrypt+56,"\xEF\xEF\xEF\xEF",4);
*/
		// this way requires only one AES instead of 4
		uint8_t decrypt[16], iv[16];
		aes_context ctx;

		memcpy(iv, data+40, 16);
		ctr_add(iv,3);
		if (!aes_setkey(&ctx, AES_ENCRYPT, data+8, 32) && !aes_cipher(&ctx, iv, decrypt))
		{
			*((uint32_t*)(decrypt+8)) ^= *((uint32_t*)(data+56));
			return !memcmp(decrypt+8,"\xEF\xEF\xEF\xEF",4);
		}
	}
	return false;
}
```

**Поэтому нужно:**

1. Перехватывать весь TCP на порту 443: `--wf-tcp-out=443`
2. Фильтровать на уровне nfqws: `--filter-l7=mtproto`
3. Использовать `--payload=mtproto_initial` для реакции только на первый пакет

---

## Можно ли применять `dupsid` и TLS методы к MTProto?

**Нет, нельзя!**

`dupsid` — это **TLS-специфичная модификация**, которая копирует Session ID из реального TLS ClientHello в фейк.
MTProto — это **собственный зашифрованный протокол Telegram** (AES-CTR), а не TLS. Поэтому:

- ❌ `tls_mod=dupsid` — не работает
- ❌ `tls_mod=rnd,rndsni` — не работает
- ❌ `blob=fake_default_tls` — бесполезен

**Что применимо для MTProto:**

- ✅ `split`/`multisplit` — разбиение пакетов
- ✅ `disorder`/`multidisorder` — переупорядочивание
- ✅ `fake` с generic данными (`blob=0x00000000`)
- ✅ TTL трюки (`ip_ttl`, `ip_autottl`)
- ✅ `tcp_md5`, `badseq` и другие TCP fooling методы

**Пример для MTProto:**

```bash
winws2 --wf-tcp-out=443 \
  --filter-l7=mtproto \
  --payload=mtproto_initial \
  --lua-desync=fake:blob=0x00000000:ip_ttl=5:tcp_md5 \
  --lua-desync=split:pos=8
```

MTProto детектится только на **первом TCP пакете с данными** после хендшейка (требуется conntrack).

Отличный вопрос! Это ключевой момент понимания работы DPI и обхода.

## Логика работы

**DPI определяет протокол по первым пакетам.** Если DPI распознал MTProto в начале соединения — он блокирует/ресетит всё
соединение. Если не распознал — пропускает дальше.

Поэтому **"дурилка" нужна только на первых пакетах**:

```
Клиент ──[mtproto_initial]──> DPI ──> Сервер Telegram
              ↑
         ТУТ нужен desync
```

После успешного "пробития" первого пакета, DPI уже потерял контекст и не понимает, что это MTProto. Дальнейший трафик
идёт без обработки.

## Как это реализовано

Параметр `--out-range` ограничивает диапазон обработки:

```bash
winws2 --wf-tcp-out=443 \
  --filter-l7=mtproto \
  --out-range=-d10 \
  --payload=mtproto_initial \
  --lua-desync=fake:blob=0x00000000:ip_ttl=5:tcp_md5 \
  --lua-desync=split:pos=8
```

- `--out-range=-d10` — обрабатывать только первые 10 пакетов с данными
- `--payload=mtproto_initial` — реагировать только на первый пакет MTProto

## Итог

| Пакет                 | Обработка                         |
|-----------------------|-----------------------------------|
| 1-й (mtproto_initial) | ✅ Применяется fake/split/disorder |
| 2-й и далее           | ❌ Пропускается без изменений      |

**Это нормально и правильно** — вся суть в том, чтобы сбить DPI на этапе детекции протокола. После этого соединение уже
установлено и DPI не знает, что блокировать.

Аналогично работает и для TLS (`tls_client_hello`), и для QUIC (`quic_initial`) — обрабатывается только инициализация.

Хороший вопрос! Давайте посмотрю точно в коде:

[1 tool called]

После детекции:

## Протокол (l7proto) → **known** (mtproto)

```1233:1234:nfq2/desync.c
				l7proto = L7_MTPROTO;
				if (ctrack->l7proto == L7_UNKNOWN) ctrack->l7proto = l7proto;
```

Протокол **сохраняется в conntrack**. Все последующие пакеты этого соединения будут иметь `l7proto = L7_MTPROTO`.

## Payload (l7payload) → **unknown**

Только первый пакет имеет `l7payload = L7P_MTPROTO_INITIAL`. Все остальные пакеты соединения будут
`l7payload = L7P_UNKNOWN`.

## Итоговая картина

| Пакет | l7proto   | l7payload         |
|-------|-----------|-------------------|
| 1-й   | `mtproto` | `mtproto_initial` |
| 2-й   | `mtproto` | `unknown`         |
| 3-й   | `mtproto` | `unknown`         |
| ...   | `mtproto` | `unknown`         |

## Что это значит для фильтров

```bash
--filter-l7=mtproto           # ✅ Матчит ВСЕ пакеты соединения
--filter-l7=known             # ✅ Матчит ВСЕ пакеты соединения  
--payload=mtproto_initial     # ✅ Матчит только 1-й пакет
--payload=unknown             # ✅ Матчит 2-й и далее
```

Поэтому типичная конфигурация:

```bash
--filter-l7=mtproto --payload=mtproto_initial --lua-desync=...
```

Обработает только первый пакет, а остальные пройдут мимо (payload не совпадёт).

## Механизм запоминания

**Conntrack** = отслеживание соединений по ключу `(src_ip, src_port, dst_ip, dst_port, protocol)`.

### Шаг 1: Первый пакет — детекция и сохранение

```1233:1235:nfq2/desync.c
			l7proto = L7_MTPROTO;
			if (ctrack->l7proto == L7_UNKNOWN) ctrack->l7proto = l7proto;
		}
```

При детекции MTProto протокол **сохраняется в структуру ctrack** этого соединения.

### Шаг 2: Последующие пакеты — извлечение из памяти

```1013:1013:nfq2/desync.c
		if (ctrack) l7proto = ctrack->l7proto;
```

На каждом новом пакете **сначала смотрим в conntrack** — если там уже есть определённый протокол, берём его оттуда.

## Как это работает

```
Пакет 1 (mtproto_initial):
  ┌─────────────────────────────────────┐
  │ Conntrack lookup по (ip:port)       │
  │ ctrack->l7proto = UNKNOWN           │
  │ → Детекция: IsMTProto() = true      │
  │ → Сохранение: ctrack->l7proto = MTPROTO │
  └─────────────────────────────────────┘

Пакет 2 (зашифрованный мусор):
  ┌─────────────────────────────────────┐
  │ Conntrack lookup по (ip:port)       │
  │ ctrack->l7proto = MTPROTO  ← уже!   │
  │ → Детекция не нужна                 │
  │ → l7proto = MTPROTO                 │
  └─────────────────────────────────────┘
```

## Ключ соединения

Conntrack идентифицирует соединение по кортежу:

- Source IP + Source Port
- Destination IP + Destination Port
- Protocol (TCP/UDP)

Все пакеты с одинаковым кортежом принадлежат одному соединению и используют **одну и ту же структуру ctrack** с
сохранённым `l7proto`.

Поэтому даже когда после первого пакета идёт "мусор" — zapret **не анализирует содержимое**, а просто смотрит "этот
пакет от того же соединения? → значит это MTProto".

Покажу примеры для MTProto с разной логикой:

## 1. Только первый пакет (стандартный случай)

Дурим DPI только на инициализации — этого обычно достаточно:

```bash
winws2 --wf-tcp-out=443 \
  --filter-l7=mtproto \
  --payload=mtproto_initial \
  --lua-desync=fake:blob=0x00000000:ip_ttl=5:tcp_md5 \
  --lua-desync=split:pos=8
```

| Пакет         | Обработка      |
|---------------|----------------|
| 1-й (initial) | ✅ fake + split |
| 2-й и далее   | ❌ пропуск      |

---

## 2. Все пакеты MTProto соединения

Если DPI анализирует весь поток (редко, но бывает):

```bash
winws2 --wf-tcp-out=443 \
  --filter-l7=mtproto \
  --out-range=-d20 \
  --lua-desync=split:pos=8
```

| Пакет | Обработка |
|-------|-----------|
| 1-20  | ✅ split   |
| 21+   | ❌ пропуск |

---

## 3. Разная логика для initial и остальных

```bash
winws2 --wf-tcp-out=443 \
  --filter-l7=mtproto --payload=mtproto_initial \
    --lua-desync=fake:blob=0x00000000:ip_ttl=3:tcp_md5 \
    --lua-desync=disorder:pos=8 \
  --new \
  --filter-l7=mtproto --payload=unknown --out-range=-d10 \
    --lua-desync=split:pos=16
```

| Пакет         | Обработка       |
|---------------|-----------------|
| 1-й (initial) | fake + disorder |
| 2-10          | split           |
| 11+           | пропуск         |

---

## 4. MTProto + TLS + HTTP в одном инстансе

```bash
winws2 --wf-tcp-out=80,443 \
  --lua-init=@zapret-lib.lua \
  --lua-init=@zapret-antidpi.lua \
  \
  --filter-l7=mtproto --payload=mtproto_initial \
    --lua-desync=fake:blob=0x00000000:ip_ttl=5:tcp_md5 \
    --lua-desync=split:pos=8 \
  --new \
  --filter-l7=tls --payload=tls_client_hello \
    --lua-desync=fake:blob=fake_default_tls:tcp_md5:tls_mod=rnd,dupsid \
    --lua-desync=multisplit:pos=1,midsld \
  --new \
  --filter-l7=http --payload=http_req \
    --lua-desync=fake:blob=fake_default_http:ip_ttl=5 \
    --lua-desync=split:pos=host+1
```

| Протокол | Payload      | Обработка                  |
|----------|--------------|----------------------------|
| MTProto  | initial      | fake + split               |
| TLS      | client_hello | fake с dupsid + multisplit |
| HTTP     | request      | fake + split по host       |

---

## 5. Только MTProto, игнорировать всё остальное (тоже что и первый)

```bash
winws2 --wf-tcp-out=443 \
  --filter-l7=mtproto \
  --payload=mtproto_initial \
  --lua-desync=fake:blob=0x00000000:ip_ttl=4:repeats=3 \
  --lua-desync=disorder:pos=4,16
```

TLS на 443 пройдёт мимо — `--filter-l7=mtproto` его отфильтрует.

---

## 6. Всё кроме MTProto

```bash
winws2 --wf-tcp-out=80,443 \
  --filter-l7=tls,http \
  --payload=tls_client_hello,http_req \
  --lua-desync=fake:blob=fake_default_tls:tcp_md5 \
  --lua-desync=multisplit:pos=midsld
```

MTProto на 443 пройдёт без обработки — он не в `--filter-l7`.

---

## 7. Агрессивный режим — все known протоколы

```bash
winws2 --wf-tcp-out=443 \
  --filter-l7=known \
  --out-range=-d5 \
  --lua-desync=disorder:pos=8
```

| l7proto | Обработка |
|---------|-----------|
| mtproto | ✅         |
| tls     | ✅         |
| http    | ✅         |
| unknown | ❌         |

---

## Сводная таблица фильтров

| Фильтр                      | Что матчит                  |
|-----------------------------|-----------------------------|
| `--filter-l7=mtproto`       | Только MTProto соединения   |
| `--filter-l7=known`         | Все распознанные протоколы  |
| `--filter-l7=unknown`       | Нераспознанные соединения   |
| `--payload=mtproto_initial` | Только 1-й пакет MTProto    |
| `--payload=known`           | Любой распознанный payload  |
| `--payload=unknown`         | Нераспознанные пакеты       |
| `--out-range=-d10`          | Первые 10 пакетов с данными |

Первый пакет: l7proto="mtproto", l7payload="mtproto_initial"

Последующие пакеты: l7proto="mtproto" (из ctrack), l7payload="unknown"
