---
title: Installation Workflow
zapret2-version: v0.9.4.5
tags: install, setup, workflow, router, desktop
source: official-docs
created: 2026-03-25
updated: 2026-03-25
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

6. Настроить DNS (один из методов):
   ```bash
   # Через systemd-resolved
   mkdir -p /etc/systemd/resolved.conf.d/
   cat > /etc/systemd/resolved.conf.d/dns.conf << EOF
   [Resolve]
   DNS=1.1.1.1 8.8.8.8
   EOF
   systemctl restart systemd-resolved

   # Или через resolv.conf
   echo "nameserver 1.1.1.1" > /etc/resolv.conf
   ```

7. Создать systemd unit:
   ```bash
   cat > /etc/systemd/system/zapret2.service << EOF
   [Unit]
   Description=zapret2 DPI bypass
   After=network-online.target
   Wants=network-online.target

   [Service]
   Type=forking
   ExecStart=/opt/zapret2/init.d/sysv/zapret2 start
   ExecStop=/opt/zapret2/init.d/sysv/zapret2 stop
   RemainAfterExit=yes

   [Install]
   WantedBy=multi-user.target
   EOF
   systemctl daemon-reload
   systemctl enable zapret2
   ```

8. Включить и запустить (шаги 7-9 из универсальной установки)

## Предварительные требования

### Необходимые инструменты
- `nft` или `iptables` — управление firewall
- `curl` — скачивание бинарников
- `git` — клонирование репозитория
- `base64`, `sed`, `awk` — обработка конфигов
- `modprobe` — загрузка модулей ядра

### Модуль ядра NFQUEUE
```bash
modprobe nfnetlink_queue
```
Без NFQUEUE nfqws2 не может перехватывать пакеты.

### Архитектуры
Поддерживаются: x86_64, x86, arm64, arm, mips, mipsel, mips64, ppc, riscv64

## Управление сервисом

| Init system | Команда |
|-------------|---------|
| sysv | `/opt/zapret2/init.d/sysv/zapret2 start\|stop\|restart` |
| systemd | `systemctl start\|stop\|restart zapret2` |
| OpenWrt | `/etc/init.d/zapret2 start\|stop\|restart` |
| openrc | `/opt/zapret2/init.d/openrc/zapret2 start\|stop\|restart` |
