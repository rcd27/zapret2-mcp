---
title: IPv6 ловушка — почему стратегия найдена, но сайты не открываются
zapret2-version: v0.9.4.5
tags: troubleshooting, ipv6, bypass, blockcheck, dual-stack, apple, android
source: community
created: 2026-03-28
updated: 2026-03-28
---

# IPv6 ловушка: стратегия работает, а сайты — нет

## Проблема

Одна из самых коварных ловушек при настройке zapret2:

1. Запускаешь blockcheck2 → находит рабочую стратегию
2. Применяешь стратегию в конфиг → перезапускаешь zapret2
3. Проверяешь `curl` на роутере → работает
4. Открываешь YouTube на устройстве → **не работает**

Причина: **трафик устройства идёт по IPv6, а zapret2 обрабатывает только IPv4.**

## Почему это происходит

### Dual-stack у провайдера

Многие провайдеры (Ростелеком, Билайн, МТС) выдают IPv6 "из коробки". Роутер получает и IPv4, и IPv6 адреса. Устройства в сети предпочитают IPv6 (это стандартное поведение — RFC 6724).

### blockcheck2 тестирует IPv4

По умолчанию blockcheck2 ищет стратегии для **IPv4** (`IPVS=4`). Найденная стратегия применяется к IPv4-трафику. Но устройство отправляет запросы по **IPv6**, которые идут мимо nfqws2 → попадают под DPI без bypass.

### zapret2 и IPv6

zapret2 **поддерживает** IPv6 (`--filter-l3=ipv6`, `DISABLE_IPV6=0`), но:

- По умолчанию `DISABLE_IPV6=1` в конфиге — IPv6 не обрабатывается
- В LuCI-интерфейсе zapret (OpenWrt) нет флажка для тестирования IPv6-стратегий
- nftables rules zapret создаёт только для IPv4 (`ip daddr`), если IPv6 отключён
- blockcheck2 по умолчанию не тестирует IPv6

### Устройства Apple — отдельная боль

Apple-устройства агрессивно используют IPv6:
- **iCloud Private Relay** — маршрутизирует трафик мимо роутера
- **Limit IP Tracking** — аналогично
- **Частный адрес Wi-Fi** — рандомизация MAC, может влиять на маршрутизацию
- iPhone/Mac предпочитают AAAA-записи (IPv6) при dual-stack

## Диагностика

### Проверить наличие IPv6

```bash
# На роутере:
ip -6 addr show scope global
# Если видно глобальный IPv6 адрес (2xxx:...) — dual-stack активен

# Проверить IPv6 маршрут:
ip -6 route show default
# Если есть default route — IPv6 трафик уходит к провайдеру
```

### Проверить куда идёт трафик устройства

```bash
# На роутере — мониторить IPv6 трафик к YouTube:
tcpdump -i br-lan ip6 and port 443 -c 20
# Если видно пакеты — устройства ходят по IPv6
```

### Проверить конфиг zapret2

```bash
grep DISABLE_IPV6 /opt/zapret2/config
# Если DISABLE_IPV6=1 — zapret2 не обрабатывает IPv6
```

### Проверить nftables rules

```bash
nft list ruleset | grep -c "ip6"
# Если 0 — правил для IPv6 нет, трафик идёт мимо nfqws2
```

## Решения

### Вариант 1: Отключить IPv6 на WAN (самый простой)

Если IPv6 не нужен — отключить его на WAN-интерфейсе. Весь трафик пойдёт по IPv4 через zapret2.

**LuCI:** Network → Interfaces → WAN → Advanced → IPv6: **Disabled**

**UCI:**
```bash
uci set network.wan.ipv6='0'
uci commit network
/etc/init.d/network restart
```

### Вариант 2: Включить IPv6 в zapret2

Если IPv6 нужен — включить его обработку в zapret2.

```bash
# В /opt/zapret2/config:
DISABLE_IPV6=0
```

Затем найти стратегию для IPv6:
```bash
# blockcheck2 с IPv6:
IPVS=46 blockcheck2 ...
# или только IPv6:
IPVS=6 blockcheck2 ...
```

Перезапустить:
```bash
/etc/init.d/zapret2 restart
```

**Важно:** стратегия для IPv4 может не работать для IPv6 и наоборот. Нужно тестировать отдельно.

### Вариант 3: Отключить IPv6 только для проблемных устройств

На конкретном устройстве:

**Android:** Настройки → Wi-Fi → (сеть) → IP settings → Static → оставить только IPv4

**Apple (macOS/iOS):**
- iCloud Private Relay: **Выключить**
- Limit IP Tracking: **Отключить**
- Частный адрес Wi-Fi: **Выкл** или **Фиксированный**
- IPv6: перевести в **Link-local only** или выключить

**Windows:**
```powershell
# Отключить IPv6 на адаптере:
netsh interface ipv6 set interface "Wi-Fi" routerdiscovery=disabled
# Или через GUI: Адаптер → Свойства → снять галку "TCP/IPv6"
```

### Вариант 4: DNS-фильтрация AAAA (продвинутый)

Заблокировать AAAA-ответы (IPv6-адреса) в DNS, чтобы устройства fallback-или на IPv4:

```bash
# В dnsmasq (OpenWrt):
uci set dhcp.@dnsmasq[0].filter_aaaa='1'
uci commit dhcp
/etc/init.d/dnsmasq restart
```

Это заставит все устройства использовать только IPv4 для DNS-резолвинга, при этом IPv6-связность сохраняется для локальной сети.

**Внимание:** ZeroBlock фиксил баг, когда AAAA-запросы ломали FakeIP DNS при выключенном IPv6. Если используете ZeroBlock + sing-box, проверьте что FakeIP rules матчат только `query_type=A`.

## Чеклист: стратегия найдена, но не работает

1. [ ] Есть ли IPv6 на WAN? `ip -6 addr show scope global`
2. [ ] `DISABLE_IPV6` в конфиге zapret2 — что стоит?
3. [ ] blockcheck2 тестировал IPv4 или IPv6? (параметр `IPVS`)
4. [ ] Есть ли IPv6 nftables rules? `nft list ruleset | grep ip6`
5. [ ] Устройство — Apple? Проверить Private Relay, Limit IP Tracking
6. [ ] Самый быстрый фикс: отключить IPv6 на WAN или `filter_aaaa=1` в dnsmasq
