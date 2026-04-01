---
title: Installation Workflow
zapret2-version: v0.9.4.5
tags: install, setup, workflow, router, desktop
source: official-docs
created: 2026-03-25
updated: 2026-04-01
---

# Установка zapret2

## Универсальная установка (роутер/сервер)

1. Определить окружение (OS, init system, WAN-интерфейс)
2. Проверить предварительные требования (инструменты, архитектура, сеть)
3. Клонировать репозиторий:
   ```bash
   cd /opt && git clone https://github.com/bol-van/zapret2.git zapret2
   ```
4. Скачать бинарники из релиза:
   ```bash
   cd /tmp
   curl -sLO 'https://github.com/bol-van/zapret2/releases/download/v0.9.4.5/zapret2-v0.9.4.5.tar.gz'
   tar xzf zapret2-v0.9.4.5.tar.gz
   cp -r zapret2-v0.9.4.5/binaries/* /opt/zapret2/binaries/
   ```
5. Установить бинарники:
   ```bash
   cd /opt/zapret2 && sh install_bin.sh
   ```
6. Запустить интерактивную установку:
   ```bash
   sh install_easy.sh
   ```
7. Включить nfqws2:
   ```bash
   sed -i 's/NFQWS2_ENABLE=0/NFQWS2_ENABLE=1/' /opt/zapret2/config
   ```
8. Запустить сервис:
   ```bash
   /opt/zapret2/init.d/sysv/zapret2 start
   ```
9. Проверить bypass

## Установка на Linux-десктоп (systemd)

Те же шаги 1-5, плюс:

1. Установить systemd unit (поставляется с репо):
   ```bash
   cp /opt/zapret2/init.d/systemd/zapret2.service /etc/systemd/system/
   systemctl daemon-reload
   systemctl enable zapret2
   ```

2. Включить и запустить (шаги 7-9 из универсальной установки)

> DNS-конфигурация не является частью установки zapret2. Если у провайдера DNS-перехват — рекомендуется настроить
> DoH/DoT отдельно.

## Предварительные требования

### Необходимые инструменты

- `nft` (nftables) или `iptables` + `ip6tables` + `ipset` — управление firewall
- `curl` — скачивание бинарников и списков

### Модуль ядра NFQUEUE

Модуль `nfnetlink_queue` необходим для работы nfqws2. Обычно подгружается автоматически при старте. Если нет:

```bash
modprobe nfnetlink_queue
```

### Архитектуры

Поддерживаются: x86_64, x86, arm64, arm, mips64, mipssf, mipselsf, ppc, riscv64, lexra

## Управление сервисом

| Init system | Команда                                                   |
|-------------|-----------------------------------------------------------|
| sysv        | `/opt/zapret2/init.d/sysv/zapret2 start\|stop\|restart`   |
| systemd     | `systemctl start\|stop\|restart zapret2`                  |
| OpenWrt     | `/etc/init.d/zapret2 start\|stop\|restart`                |
| openrc      | `/opt/zapret2/init.d/openrc/zapret2 start\|stop\|restart` |
| runit       | `/opt/zapret2/init.d/runit/zapret2`                       |
| s6          | `/opt/zapret2/init.d/s6/zapret2`                          |
| pfsense     | `/opt/zapret2/init.d/pfsense/zapret2`                     |
