---
title: Supported Platforms
zapret2-version: v0.9.4.5
tags: platforms, linux, openwrt, wsl2, windows, macos, freebsd, openbsd, bsd, dvtws2, winws2, android
source: deepwiki/bol-van/zapret2, official-docs
created: 2026-03-25
updated: 2026-04-15
revision: 2
---

# Поддерживаемые платформы

## Linux (десктоп/сервер)

Полная поддержка. Init systems:

- **systemd** — большинство современных дистрибутивов (Ubuntu, Fedora, Arch, Debian)
- **sysv** — классические системы
- **openrc** — Gentoo, Alpine
- **runit** — Void Linux
- **s6** — некоторые embedded-системы

Firewall: nftables (предпочтительно) или iptables.

## OpenWrt (роутер)

Полная поддержка. Особенности:

- Init: procd (OpenWrt-specific)
- Пакетный менеджер: `opkg` или `apk` (новые snapshot)
- Сетевые интерфейсы: через UCI (`IFACE_WAN`, `IFACE_LAN`)
- Ограниченная RAM — подбирать количество воркеров blockcheckw (обычно 64)

## Windows

Поддерживается через **winws2** (WinDivert-based). Демон `winws2` — нативный Windows-бинарник.

Особенности:

- Использует WinDivert вместо NFQUEUE для перехвата пакетов
- Компилируется со статической линковкой зависимостей (защита от DLL injection)
- Security: ASLR/DEP (`--nxcompat`, `--high-entropy-va`), dynamic base relocation
- Sandbox: low integrity level + job object restrictions

**Альтернатива**: WSL2 (Windows Subsystem for Linux) — установить zapret2 как на обычный Linux.

## FreeBSD

Поддерживается через **dvtws2** (DiVerT WorkStation 2). Использует `ipfw` с divert-сокетами.

Особенности:

- Один divert-сокет обслуживает и IPv4, и IPv6
- Firewall: `ipfw` с divert-правилами
- Интерфейс определяется из `sockaddr` после `recvfrom()`
- Совместим с pfSense/OPNsense через специальные скрипты

```
# Пример ipfw-правила
ipfw add divert 989 tcp from any to any 443 out
```

**Ограничения BSD**: нет фильтрации по payload в firewall, нет per-flow kernel filtering, каждый пакет проходит через
userspace.

## OpenBSD

Поддерживается через **dvtws2**. Использует `pf` с `divert-packet`.

Особенности:

- **Раздельные** divert-сокеты для IPv4 и IPv6 (в отличие от FreeBSD)
- Firewall: `pf` с правилами `divert-packet`
- `no state` — чтобы pf не создавал автоматические bidirectional-правила

```
# Пример pf-правила
pass out on egress inet proto tcp to port 443 divert-packet port 989 no state
```

## macOS

**Не поддерживается.** Apple удалила `ipdivert` из ядра — механизм divert-сокетов недоступен, несмотря на BSD-наследие.

## Android

Поддерживается (Linux-based). Особенности:

- Обработка отсутствия `/etc/passwd` для privilege dropping
- Интеграция с `logcat` через `liblog`
- Преимущественно статическая линковка (ограничения Bionic libc)
