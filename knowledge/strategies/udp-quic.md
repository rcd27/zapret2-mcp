---
title: UDP/QUIC Strategies
zapret2-version: v0.9.4.5
tags: udp, quic, ipfrag2, udplen, udplen-pattern, fragmentation, fake-quic, youtube, repeats
source: official-docs, community
created: 2026-03-25
updated: 2026-03-30
---

# UDP/QUIC стратегии

Стратегии для обхода блокировки UDP-трафика (QUIC, DNS).

## Стратегии

### IP-фрагментация (ipfrag2)

```
--dpi-desync=ipfrag2
```

Фрагментирует IP-пакеты так, чтобы DPI не мог пересобрать. Работает для stateless DPI.

### UDP padding (udplen)

```
--dpi-desync-udplen-increment=N
```

Добавляет padding к UDP-пакетам. Меняет сигнатуру пакета, DPI не распознаёт.

Lua-формат:

```
--lua-desync=fake:blob=fake_default_quic:udplen=N
```

#### udplen-pattern

Содержимое padding можно задать паттерном — DPI, который анализирует содержимое UDP, получает "мусор" вместо ожидаемых
байтов:

```
--dpi-desync-udplen-pattern=0xFEA82025
```

Lua-формат:

```
--lua-desync=fake:blob=fake_default_quic:udplen=8:udplen_pattern=0x0F0F0E0F
```

Community-практика: паттерны `0xFEA82025` и `0x0F0F0E0F` зарекомендовали себя для QUIC YouTube. Они могут напоминать
фрагменты TLS handshake, сбивая DPI-эвристику.

### Fake QUIC

```
--dpi-desync-fake-quic=<file>
```

Кастомный fake QUIC Initial payload.

Lua-формат:

```
--lua-desync=fake:blob=fake_default_quic:repeats=6
```

#### Выбор fake QUIC blob

Стандартный `fake_default_quic` не всегда эффективен. Доступные blobs:

| Blob                          | Когда использовать                                         |
|-------------------------------|------------------------------------------------------------|
| `fake_default_quic`           | По умолчанию, первый вариант                               |
| `quic_initial_www_google_com` | Для YouTube/Google — DPI видит "легитимный" Google QUIC    |
| `quic_initial_facebook_com`   | Для Facebook/Instagram                                     |
| `quic_initial_vk_com`         | Российский QUIC — может проходить через ТСПУ без инспекции |
| `quic_initial_rutracker_org`  | Альтернативный вариант                                     |

#### Количество repeats

Для QUIC fake количество повторений критично — UDP не гарантирует доставку:

| repeats | Применение                                         |
|---------|----------------------------------------------------|
| 2-3     | Лёгкий DPI, минимальный overhead                   |
| 6       | Стандартное значение, баланс надёжности и нагрузки |
| 8-11    | Агрессивный DPI, когда 6 repeats не хватает        |

Больше 11 repeats — обычно избыточно и создаёт заметную нагрузку.

## Комбинации стратегий для QUIC

### fake + ipfrag2

Отправить fake, затем фрагментировать реальный пакет:

```
--filter-udp=443 --filter-l7=quic
  --payload=quic_initial
  --lua-desync=fake:blob=quic_initial_www_google_com:ipfrag2:repeats=3
```

`ipfrag2` в UDP разбивает пакет на 2 IP-фрагмента с offset 8 байт. Эффективно против stateless DPI.

### fake + udplen

Fake-пакет + модификация длины реального:

```
--filter-udp=443 --filter-l7=quic
  --payload=quic_initial
  --lua-desync=fake:blob=fake_default_quic:udplen=4:repeats=2
```

Инкремент 4-25 байт — DPI не распознаёт QUIC Initial по размеру.

### Cutoff: когда прекратить обработку

`cutoff` ограничивает обработку первыми N пакетами UDP-потока:

```
--lua-desync=fake:blob=fake_default_quic:repeats=6:cutoff=3
```

`cutoff=3` — обработать только первые 3 пакета (QUIC Initial handshake). Остальной QUIC-трафик проходит без модификации,
снижая нагрузку.

## Особенности QUIC

QUIC — самый сложный протокол для bypass:

- Зашифрован с первого пакета (нет plaintext handshake)
- UDP-based — нет TCP sequence numbers для manipulation
- IP-фрагментация или fake-based стратегии — основные подходы
- **ТСПУ обрабатывает QUIC отдельно от TCP** — стратегия для HTTPS не работает для QUIC

## Пример конфигурации для QUIC

Базовый:

```
--filter-udp=443 --filter-l7=quic
  --payload=quic_initial
  --lua-desync=fake:blob=fake_default_quic:repeats=6
```

Продвинутый (с udplen-pattern и конкретным blob):

```
--filter-udp=443 --filter-l7=quic
  --payload=quic_initial
  --lua-desync=fake:blob=quic_initial_www_google_com:udplen=8:udplen_pattern=0x0F0F0E0F:repeats=2:cutoff=3
```

## Протоколы и сложность bypass

| Протокол | Сложность | Рекомендация                                         |
|----------|-----------|------------------------------------------------------|
| HTTP     | Лёгкая    | hostcase + split                                     |
| TLS 1.3  | Простая   | split2 по SNI позиции                                |
| TLS 1.2  | Средняя   | Нужны стратегии для ClientHello и ServerHello        |
| QUIC/UDP | Сложная   | fake с repeats=6+, или fake+udplen, или fake+ipfrag2 |
