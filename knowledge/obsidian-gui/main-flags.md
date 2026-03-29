---
title: Основные флаги запуска nfqws2/winws2
zapret2-version: v0.9.4.5
tags: флаги, nfqws2, winws2, параметры, запуск, qnum, daemon, pidfile
created: 2026-03-29
updated: 2026-03-29
source: community
---

## Полный список обманок (fooling) в zapret2

### 🔹 **IP/IPv4 модификации**

1. **`ip_ttl=N`** - установить TTL (Time To Live) в IPv4 заголовке
   - Пример: `ip_ttl=5`

2. **`ip_autottl=delta,min-max`** - автоматическое определение TTL
   - Формат: `delta,min-max` (например: `-1,3-20`)
   - Автоматически вычисляет оптимальный TTL на основе входящих пакетов

### 🔹 **IPv6 модификации**

3. **`ip6_ttl=N`** - установить Hop Limit в IPv6 заголовке (аналог TTL)
   - Пример: `ip6_ttl=3`

4. **`ip6_autottl=delta,min-max`** - автоматическое определение Hop Limit для IPv6
   - Формат: `delta,min-max`

### 🔹 **IPv6 Extension Headers (расширенные заголовки)**

5. **`ip6_hopbyhop[=hex]`** - добавить Hop-by-Hop заголовок
   - Размер данных: 6+N×8 байт
   - По умолчанию: `\x00\x00\x00\x00\x00\x00`

6. **`ip6_hopbyhop2[=hex]`** - добавить второй Hop-by-Hop заголовок
   - Размер данных: 6+N×8 байт

7. **`ip6_destopt[=hex]`** - добавить Destination Options заголовок (unfragmentable part)
   - Размер данных: 6+N×8 байт

8. **`ip6_destopt2[=hex]`** - добавить второй Destination Options заголовок (fragmentable part)
   - Размер данных: 6+N×8 байт

9. **`ip6_routing[=hex]`** - добавить Routing заголовок
   - Размер данных: 6+N×8 байт

10. **`ip6_ah[=hex]`** - добавить Authentication Header (усеченный)
    - Размер данных: 6+N×4 байт
    - По умолчанию: `\x00\x00` + 4 случайных байта

### 🔹 **TCP модификации**

11. **`tcp_seq=N`** - добавить N к TCP sequence number
    - Пример: `tcp_seq=10000`
    - Используется для "badseq" обманки

12. **`tcp_ack=N`** - добавить N к TCP acknowledgment number
    - Пример: `tcp_ack=-66000`
    - Используется для "badack" обманки (обычно отрицательное значение)

13. **`tcp_ts=N`** - добавить N к TCP timestamp value
    - Модифицирует TCP опцию timestamp

14. **`tcp_md5[=hex]`** - добавить TCP MD5 опцию (RFC 2385)
    - Размер: 16 байт
    - По умолчанию: случайные данные
    - Пример: `tcp_md5` или `tcp_md5=0x00112233445566778899aabbccddeeff`

15. **`tcp_flags_set=<список>`** - установить TCP флаги
    - Список через запятую: `FIN,SYN,RST,PSH,ACK,URG,ECE,CWR`
    - Пример: `tcp_flags_set=PSH,URG`

16. **`tcp_flags_unset=<список>`** - снять TCP флаги
    - Пример: `tcp_flags_unset=ACK` (для "datanoack" обманки)

17. **`tcp_ts_up`** - переместить TCP timestamp опцию в начало
    - Без параметров
    - Workaround для Linux: позволяет отбрасывать пакеты с badack без badseq

### 🔹 **Дополнительные опции**

18. **`badsum`** - сделать контрольную сумму L4 невалидной
    - Без параметров
    - Относится к reconstruct options

19. **`fool=функция`** - вызвать пользовательскую функцию обманки
    - Формат: `fool_func(dis, fooling_options)`
    - Для создания собственных обманок

### 📋 **Популярные комбинации (из nfqws1)**

В старой версии (nfqws1) были готовые комбинации:

- **`md5sig`** → `tcp_md5`
- **`badseq`** → `tcp_seq=-10000` (для SYN) или `tcp_ack=-66000` (для обычных пакетов)
- **`badack`** → `tcp_ack=-66000`
- **`datanoack`** → `tcp_flags_unset=ACK`

### 💡 **Примеры использования**

```bash
# Простой TTL
--lua-desync=fake:ip_ttl=5

# Автоматический TTL
--lua-desync=fake:ip_autottl=-1,3-20

# TCP MD5 signature (обманка для DPI)
--lua-desync=fake:tcp_md5

# Badseq + badack (классическая обманка)
--lua-desync=fakedsplit:tcp_seq=-10000:tcp_ack=-66000:tcp_ts_up

# IPv6 extension headers
--lua-desync=fake:ip6_hopbyhop:ip6_destopt

# Снять ACK флаг (datanoack)
--lua-desync=fake:tcp_flags_unset=ACK

# Комбинация нескольких обманок
--lua-desync=fake:ip_ttl=1:tcp_md5:tcp_ack=-66000
```

Все эти обманки применяются функцией `apply_fooling()` из библиотеки `zapret-lib.lua` и используются для обхода DPI систем путем создания пакетов, которые проходят через DPI, но отбрасываются целевым сервером или наоборот.
