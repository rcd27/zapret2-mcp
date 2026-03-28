---
title: UDP/QUIC Strategies
zapret2-version: v0.9.4.5
tags: udp, quic, ipfrag2, udplen, fragmentation
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

### Fake QUIC
```
--dpi-desync-fake-quic=<file>
```
Кастомный fake QUIC Initial payload.

Lua-формат:
```
--lua-desync=fake:blob=fake_default_quic:repeats=6
```

## Особенности QUIC

QUIC — самый сложный протокол для bypass:
- Зашифрован с первого пакета (нет plaintext handshake)
- UDP-based — нет TCP sequence numbers для manipulation
- IP-фрагментация или fake-based стратегии — основные подходы

## Пример конфигурации для QUIC

```
--filter-udp=443 --filter-l7=quic
  --payload=quic_initial
  --lua-desync=fake:blob=fake_default_quic:repeats=6
```

## Протоколы и сложность bypass

| Протокол | Сложность | Рекомендация |
|----------|-----------|-------------|
| HTTP | Лёгкая | hostcase + split |
| TLS 1.3 | Простая | split2 по SNI позиции |
| TLS 1.2 | Средняя | Нужны стратегии для ClientHello и ServerHello |
| QUIC/UDP | Сложная | ipfrag2 или fake с повторами |
