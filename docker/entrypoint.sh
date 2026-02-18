#!/bin/bash
# Entrypoint для zapret2 тестового контейнера
# Запускает переданную команду или bash-сессию

echo "=== zapret2-mcp test container ==="
echo "OpenWrt rootfs | $(cat /etc/openwrt_release 2>/dev/null | grep DISTRIB_RELEASE | cut -d= -f2 || echo 'unknown')"
echo "Workspace: /opt/zapret2"
echo "=================================="

exec "$@"
