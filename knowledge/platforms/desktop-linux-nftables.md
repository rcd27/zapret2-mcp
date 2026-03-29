---
title: Desktop Linux — nftables Integration
zapret2-version: v0.9.4.5
tags: nftables, desktop, linux, firewall, INIT_APPLY_FW, nft, chains, systemd
created: 2026-03-29
updated: 2026-03-29
source: deepwiki/bol-van/zapret2, official-docs, community
---

# zapret2 на десктопном Linux: nftables

## Обзор

На десктопном Linux (Ubuntu, Fedora, Arch, Debian) zapret2 использует nftables для перенаправления трафика в NFQUEUE. В отличие от OpenWrt, где интеграция через fw4 автоматическая, на десктопе нужно учитывать особенности системного nftables.

## Автоопределение firewall (FWTYPE)

zapret2 автоматически определяет тип firewall при запуске:

- **nftables** — если ядро >= 4.16 И команда `nft` доступна
- **iptables** — fallback если nftables недоступен

Можно задать вручную в `/opt/zapret2/config`:
```bash
FWTYPE=nftables    # принудительно nftables
#FWTYPE=iptables   # принудительно iptables
```

Проверить текущий тип:
```bash
/opt/zapret2/init.d/sysv/zapret2 list-table
```

## INIT_APPLY_FW — автоматическое применение правил

Ключевой параметр в `/opt/zapret2/config`:

```bash
INIT_APPLY_FW=1    # автоматически создавать правила firewall при старте сервиса
```

Когда `INIT_APPLY_FW=1`, init-скрипт при `start` вызывает `zapret_apply_firewall`, при `stop` — `zapret_unapply_firewall`. Правила создаются и удаляются вместе с демоном.

Если `INIT_APPLY_FW=0` — демон запускается, но правила firewall не трогаются. Это нужно если правила применяются внешним скриптом или firewall-менеджером.

### Хуки firewall

Для интеграции с другими firewall-решениями есть хуки:
```bash
INIT_FW_PRE_UP_HOOK="/etc/firewall.zapret2.hook.pre_up"
INIT_FW_POST_UP_HOOK="/etc/firewall.zapret2.hook.post_up"
INIT_FW_PRE_DOWN_HOOK="/etc/firewall.zapret2.hook.pre_down"
INIT_FW_POST_DOWN_HOOK="/etc/firewall.zapret2.hook.post_down"
```

## Структура nftables-таблицы

zapret2 создаёт таблицу `inet zapret2` со следующими цепочками:

### Hook-цепочки (подключены к netfilter)

| Цепочка | Hook | Priority | Назначение |
|---------|------|----------|-----------|
| `forward_hook` | forward | -1 | Перехват пересылаемого трафика |
| `prerouting_hook` | prerouting | -99 | Входящий трафик (pre-NAT) |
| `prenat_hook` | prerouting | -101 | Входящий трафик (до dstnat) |
| `postrouting_hook` | postrouting | 99 | Исходящий трафик (pre-NAT) |
| `postnat_hook` | postrouting | 101 | Исходящий трафик (после srcnat) |
| `predefrag` | output | -401 | Маркировка пакетов nfqws2, notrack |

### Наборы (sets)

| Set | Тип | Назначение |
|-----|-----|-----------|
| `wanif` | ifname | WAN-интерфейсы (IPv4) |
| `wanif6` | ifname | WAN-интерфейсы (IPv6) |
| `lanif` | ifname | LAN-интерфейсы |
| `zapret`, `zapret6` | IP-адреса | Целевые IP |
| `nozapret`, `nozapret6` | IP-адреса | Исключения |

### Маркеры (marks)

```
DESYNC_MARK=0x40000000         # пакеты, сгенерированные nfqws2
DESYNC_MARK_POSTNAT=0x20000000 # режим postnat
FILTER_MARK=0x10000000         # фильтр исходящего трафика
```

Защита от петель: правило `meta mark and $DESYNC_MARK == 0` не допускает повторную обработку пакетов nfqws2.

## POSTNAT vs PRENAT

В `/opt/zapret2/config`:
```bash
POSTNAT=0    # pre-NAT (видны реальные IP клиентов, но NAT-breaking техники недоступны)
POSTNAT=1    # post-NAT (больше возможностей bypass, IP клиентов заменены на WAN IP)
```

На десктопе обычно NAT не используется (трафик локальный), поэтому разница минимальна. На сервере-шлюзе с NAT — `POSTNAT=1` даёт больше возможностей.

## Типичные проблемы на десктопе

### nft старых версий (< 1.0.1)

**Проблема:** На старых дистрибутивах (Ubuntu 20.04, Debian 10) версия nft может быть 0.9.3–0.9.8. Известные ограничения:

- nft <= 1.0.1 не позволяет имена интерфейсов, начинающиеся с цифры, в определениях flowtable
- Непатченный nft может падать на кавычках в именах интерфейсов flowtable

**Диагностика:**
```bash
nft --version
```

**Решение:** Обновить nftables до >= 1.0.2 или отключить flow offloading:
```bash
# В config
FLOWOFFLOAD=donttouch
```

### Конфликт с firewalld / ufw

**Проблема:** Десктопные firewall-менеджеры (firewalld, ufw) могут конфликтовать с правилами zapret2.

**Диагностика:**
```bash
nft list tables    # если есть и inet zapret2, и inet firewalld — потенциальный конфликт
```

**Решения:**
1. Добавить хуки в конфиг zapret2 для координации с firewalld
2. Использовать `INIT_APPLY_FW=0` и интегрировать правила вручную через firewalld rich rules
3. Временно остановить firewalld для тестирования: `systemctl stop firewalld`

### init-скрипт не создаёт chains

**Проблема:** При старте сервиса nftables-цепочки не появляются.

**Диагностика:**
```bash
# Проверить что FWTYPE определён как nftables
grep FWTYPE /opt/zapret2/config

# Проверить что nft доступен
which nft && nft --version

# Проверить что модуль загружен
lsmod | grep nfnetlink

# Посмотреть таблицу zapret2
nft list table inet zapret2

# Запустить firewall отдельно от демона
/opt/zapret2/init.d/sysv/zapret2 start-fw
```

**Причины:**
- `INIT_APPLY_FW=0` в конфиге (правила не применяются автоматически)
- `FWTYPE` определился как `iptables` вместо `nftables`
- Ядро < 4.16 (nftables недоступен)
- Команда `nft` не установлена (`apt install nftables`)

### SELinux блокирует nft

На Fedora/RHEL SELinux может блокировать создание nft-таблиц из init-скриптов.

**Диагностика:**
```bash
ausearch -m AVC -ts recent | grep nft
```

**Решение:**
```bash
setsebool -P nis_enabled 1
# или создать локальную политику через audit2allow
```

## Полезные команды диагностики

```bash
# Показать все правила zapret2
/opt/zapret2/init.d/sysv/zapret2 list-table

# Показать настроенные интерфейсы
/opt/zapret2/init.d/sysv/zapret2 list-ifsets

# Применить/убрать правила без перезапуска демона
/opt/zapret2/init.d/sysv/zapret2 start-fw
/opt/zapret2/init.d/sysv/zapret2 stop-fw

# Перезагрузить наборы интерфейсов
/opt/zapret2/init.d/sysv/zapret2 reload-ifsets

# Проверить что пакеты попадают в NFQUEUE
nft list chain inet zapret2 postnat_hook   # или prenat_hook
```
