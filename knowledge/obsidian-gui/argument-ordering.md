---
title: Последовательность аргументов в zapret2
zapret2-version: v0.9.4.5
tags: аргументы, порядок, payload, lua-desync, hostlist, профиль, filter
created: 2026-03-29
updated: 2026-04-15
source: community
---

## 📋 **Короткий ответ: Порядок между `--hostlist` и `--payload` не важен**

Но **порядок `--payload` относительно `--lua-desync` — важен!**

---

## 🔍 **Как это работает**

### **`--hostlist`** — фильтр **профиля**

- Применяется ко всему профилю в целом
- Проверяется при входе соединения в профиль
- Позиция внутри профиля не важна

### **`--payload`** — фильтр для **`--lua-desync`**

- Применяется к **последующим** `--lua-desync` функциям
- Действует до следующего `--payload` или до конца профиля
- **Порядок относительно `--lua-desync` важен!**

---

## ✅ **Эквивалентные варианты (все работают одинаково):**

```bash
# Вариант 1: hostlist первый
--hostlist=list.txt --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls

# Вариант 2: payload первый
--payload=tls_client_hello --hostlist=list.txt --lua-desync=fake:blob=fake_default_tls

# Вариант 3: hostlist в конце
--payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls --hostlist=list.txt
```

**Все три варианта работают одинаково!**

---

## ⚠️ **Что ВАЖНО: порядок `--payload` и `--lua-desync`**

```bash
# ✅ ПРАВИЛЬНО: payload ПЕРЕД lua-desync
--payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls

# ❌ НЕПРАВИЛЬНО: payload ПОСЛЕ lua-desync (не влияет на эту функцию!)
--lua-desync=fake:blob=fake_default_tls --payload=tls_client_hello
```

---

## 📊 **Область действия фильтров**

```bash
--filter-tcp=80,443                    # Фильтр профиля (весь профиль)
--filter-l7=http,tls                   # Фильтр профиля (весь профиль)
--hostlist=youtube.txt                 # Фильтр профиля (весь профиль)
--payload=http_req                     # Фильтр lua-desync (до следующего --payload)
--lua-desync=fake:blob=fake_default_http  # Применяется фильтр http_req
--lua-desync=multisplit:pos=method+2      # Применяется фильтр http_req
--payload=tls_client_hello             # Новый фильтр (отменяет предыдущий)
--lua-desync=fake:blob=fake_default_tls   # Применяется фильтр tls_client_hello
--new                                  # Конец профиля
```

---

## 💡 **Рекомендуемый стиль (для читабельности)**

```bash
# Сначала фильтры профиля
--filter-tcp=443
--filter-l7=tls
--hostlist=mylist.txt

# Потом payload + lua-desync группами
--payload=tls_client_hello
--lua-desync=fake:blob=fake_default_tls:tcp_md5
--lua-desync=multisplit:pos=1,midsld

--new
```

Это не обязательно, но **легче читать и поддерживать**.

---

## 📝 **Итог**

| Параметр           | Область действия            | Порядок важен?                  |
|--------------------|-----------------------------|---------------------------------|
| `--filter-tcp/udp` | Весь профиль                | Нет                             |
| `--filter-l7`      | Весь профиль                | Нет                             |
| `--hostlist`       | Весь профиль                | Нет                             |
| `--ipset`          | Весь профиль                | Нет                             |
| `--payload`        | До следующего `--payload`   | **Да, перед `--lua-desync`**    |
| `--out-range`      | До следующего `--out-range` | **Да, перед `--lua-desync`**    |
| `--in-range`       | До следующего `--in-range`  | **Да, перед `--lua-desync`**    |
| `--lua-desync`     | Конкретный вызов            | Да (последовательность вызовов) |
