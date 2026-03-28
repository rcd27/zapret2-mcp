---
title: Supported Platforms
zapret2-version: v0.9.4.5
tags: platforms, linux, openwrt, wsl2, windows, macos
source: official-docs
created: 2026-03-25
updated: 2026-03-25
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

Нативно не поддерживается. Причины:
- zapret2 использует NFQUEUE (Linux kernel), Windows использует WinDivert
- Bash-скрипты vs .cmd
- Пути: `/opt/zapret2` vs `C:\zapret`

**Решение:** Использовать через WSL2 (Windows Subsystem for Linux):
1. Установить WSL2 с Ubuntu/Debian
2. Установить zapret2 как на обычный Linux
3. Настроить WSL2 для перехвата трафика хоста

## macOS

Не поддерживается. macOS не имеет NFQUEUE или аналогичного механизма перехвата пакетов.
