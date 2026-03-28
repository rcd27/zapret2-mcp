---
title: Common Issues and Troubleshooting
zapret2-version: v0.9.4.5
tags: troubleshooting, diagnosis, problems, fixes
source: official-docs
created: 2026-03-25
updated: 2026-03-25
---

# Диагностика проблем zapret2

## Порядок диагностики

1. Определить окружение (OS, init system, WAN-интерфейс)
2. Проверить статус сервиса (PID nfqws2, правила nftables, NFQWS2_ENABLE)
3. Проверить конфиг (NFQWS2_OPT, MODE, FWTYPE)
4. Проверить предварительные требования (инструменты, NFQUEUE модуль)
5. Проверить bypass (DNS-резолвинг, HTTP-коннект, статус nfqws2)

## Типичные проблемы

### IP-level блокировка (не DPI)

**Симптомы:** DNS резолвится, но соединение таймаутится при любой стратегии.
**Причина:** IP-адрес заблокирован целиком, а не через DPI-инспекцию.
**Проверка:** VPN работает? → значит IP-блок.
**Решение:** zapret2 не поможет — нужен VPN.

Быстрая проверка через blockcheckw:
```bash
blockcheckw status -d example.com
```
Если "IP blocked" → VPN.

### Неправильный fooling для fakes

**Симптомы:** Connection reset, TLS handshake failure.
**Причина:** Fake-пакеты доходят до сервера и ломают соединение.
**Решение:** Сменить fooling метод:
1. `md5sig` → самый надёжный на Linux-серверах
2. `badsum` → альтернатива (не работает если checksum offload выключен)
3. `ip_autottl` → адаптивный TTL
4. Не использовать фиксированный `ip_ttl` — хрупкий

### TTL-проблемы

**Симптомы с низким TTL:** Fakes не доходят до DPI → bypass не работает.
**Симптомы с высоким TTL:** Fakes доходят до сервера → connection break.
**Решение:** Использовать `ip_autottl` вместо фиксированного `ip_ttl`.

### Стратегия перестала работать

**Причина:** DPI обновился. Стратегия, работавшая вчера, может не работать сегодня.
**Решение:**
1. Запустить blockcheckw scan заново
2. Для resilience: `--dpi-desync-circular-strategy=N` для авто-ротации

### Модуль NFQUEUE не загружен

**Симптомы:** nfqws2 не может перехватывать пакеты.
**Решение:**
```bash
modprobe nfnetlink_queue
```
На OpenWrt может потребоваться установка пакета модуля ядра.

### Сервис не запускается

**Проверка:**
```bash
# Проверить PID
pgrep -f nfqws2

# Проверить правила firewall
nft list ruleset | grep -c zapret  # или:
iptables -L -n | grep -c NFQUEUE

# Проверить конфиг
grep NFQWS2_ENABLE /opt/zapret2/config  # должно быть =1
```

### DNS не резолвится

**Причина:** DNS-резолвер блокирует или перенаправляет запросы.
**Решение:** Настроить надёжный DNS:
```bash
# systemd-resolved
mkdir -p /etc/systemd/resolved.conf.d/
echo -e "[Resolve]\nDNS=1.1.1.1 8.8.8.8" > /etc/systemd/resolved.conf.d/dns.conf
systemctl restart systemd-resolved

# или resolv.conf
echo "nameserver 1.1.1.1" > /etc/resolv.conf
```

### 16KB DPI cap

**Симптомы:** Сайт открывается, но данные обрезаются после ~16KB (страницы грузятся частично, видео не играет).
**Причина:** DPI пропускает handshake, но обрезает data transfer.
**Диагностика:** blockcheckw check с `--passes 3` обнаружит эту проблему.
**Решение:** Выбрать стратегию, прошедшую check (32KB+ download).

## Диагностические команды

```bash
# Статус сервиса
pgrep -a nfqws2
systemctl status zapret2  # systemd
/opt/zapret2/init.d/sysv/zapret2 status  # sysv

# Правила firewall
nft list ruleset | grep -i zapret
iptables -L -n -t mangle | grep NFQUEUE

# Конфигурация
cat /opt/zapret2/config | grep -v '^#'

# NFQUEUE модуль
lsmod | grep nfnetlink_queue
modinfo nfnetlink_queue

# Сеть
ip route get 1.1.1.1
curl -m 5 -I https://example.com
```
