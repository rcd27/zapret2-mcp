---
title: Конфликты zapret2 с другим ПО на OpenWrt
zapret2-version: v0.9.4.5
tags: troubleshooting, openwrt, flowoffload, podkop, zeroblock, nft, firewall, conflicts
source: community
created: 2026-03-28
updated: 2026-03-28
---

# Конфликты zapret2 с другим ПО на OpenWrt

zapret2 перехватывает пакеты через NFQUEUE (nftables/iptables). Это может конфликтовать с другим сетевым ПО на роутере — flow offloading, VPN-маршрутизаторами, DNS-прокси. Здесь описаны основные конфликты и способы их решения.

## FLOWOFFLOAD: "работает на роутере, не работает на клиентах"

### Проблема

OpenWrt поддерживает **flow offloading** — ускорение маршрутизации за счёт переноса обработки пакетов из софтверного стека в hardware (или в ядерный fast path). Когда flow offload активен, пакеты **обходят nftables rules** и не попадают в NFQUEUE → nfqws2 их не видит → DPI bypass не работает.

### Симптомы

- `curl` на самом роутере показывает что стратегия работает (ответ от youtube.com)
- Но на клиентах (ПК, телефоны, ТВ) подключённых к роутеру YouTube/сайты не открываются
- При этом в логах nfqws2 видно что пакеты обрабатываются — но только для трафика самого роутера

### Причина

При `FLOWOFFLOAD=hardware` или системном hardware offload (LuCI → Network → Firewall → Software/Hardware flow offloading):
1. Первые несколько пакетов TCP-соединения проходят через nftables (и nfqws2 их обрабатывает)
2. После установки соединения ядро/чип переводит flow в offload path
3. Последующие пакеты идут **мимо** nftables → nfqws2 не может их обработать

Это критично для DPI bypass, потому что nfqws2 должен обработать именно первые пакеты (ClientHello), а offload может перехватить flow слишком рано.

### Решение

#### Вариант 1: Настройка FLOWOFFLOAD в конфиге zapret

В конфиге zapret (`/opt/zapret/config` или `/opt/zapret2/config`):

```bash
# Значения FLOWOFFLOAD:
# donttouch — не менять системные настройки offload (по умолчанию)
# none      — отключить offload полностью
# software  — использовать software offload (совместим с zapret)
# hardware  — hardware offload (КОНФЛИКТУЕТ с zapret!)

FLOWOFFLOAD=software
```

**Рекомендация**: `software` — компромисс между скоростью и совместимостью. zapret сам добавляет exemption rules для flow offload, чтобы пакеты на нужных портах проходили через NFQUEUE.

#### Вариант 2: Отключить системный offload

LuCI → Network → Firewall → General Settings:
- **Software flow offloading**: можно оставить включённым
- **Hardware flow offloading**: **выключить**

Или через UCI:
```bash
uci set firewall.@defaults[0].flow_offloading='1'       # software OK
uci set firewall.@defaults[0].flow_offloading_hw='0'     # hardware OFF
uci commit firewall
/etc/init.d/firewall restart
```

#### Вариант 3: Если zapret управляет offload сам

Если `FLOWOFFLOAD=software` или `FLOWOFFLOAD=hardware` указаны в конфиге zapret, то zapret сам настраивает offload и добавляет exemption rules:

```
# Пример exemption rule, который zapret добавляет в nftables:
add rule inet zapret flow_offload mark and != 0 tcp dport {80,443} ct original packets 1-9
  ip daddr != @nozapret return comment "direct flow offloading exemption"
```

Это правило говорит: "для пакетов на порты 80/443 в первых 1-9 пакетах соединения — НЕ делать offload, пропустить через обычный путь (и NFQUEUE)".

### Диагностика

```bash
# Проверить текущий offload
uci show firewall | grep offload

# Проверить FLOWOFFLOAD в конфиге zapret
grep FLOWOFFLOAD /opt/zapret2/config

# Проверить nft rules — должны быть exemption rules для zapret
nft list ruleset | grep -A2 flow_offload

# Тест: работает ли bypass на роутере
curl -m 5 -I https://www.youtube.com

# Тест: работает ли bypass на клиенте (запустить на клиенте, не на роутере)
curl -m 5 -I https://www.youtube.com
```

## Podkop (sing-box): конфликт NFT-правил

### Проблема

Podkop — популярный инструмент точечной маршрутизации через VPN/прокси на OpenWrt. Он использует sing-box + nftables для перехвата и маршрутизации трафика. Zapret тоже создаёт свои nftables rules. Они конфликтуют.

### Симптомы

- Podkop диагностика показывает: `⚠️ Zapret detected` и `⚠️ Additional marking rules found`
- FakeIP podkop может ломаться
- Часть трафика перестаёт работать (YouTube на мобилке, но работает на ПК)
- При включении zapret может упасть DNS → podkop не скачает списки → интернет пропадает полностью
- После перезагрузки роутера всё работает, но потом снова ломается

### Причина

Zapret и Podkop оба создают nftables rules с mark-ами:
- **Zapret**: `meta mark | 0x20000000`, `ct mark | 0x40000000`, queue to 200
- **Podkop**: свои mangle/proxy rules для перенаправления в sing-box

Эти правила пересекаются: трафик может сначала попасть в zapret queue, потом в podkop redirect (или наоборот), что приводит к непредсказуемому поведению.

### Официальная позиция Podkop

> Одновременное использование Podkop с zapret или youtubeunblock вызывает сбои, так как нарушает работу схемы FakeIP. Документация не содержит инструкций по настройке сторонних DPI-утилит совместно с Podkop.

Ссылки:
- Конфликты: https://podkop.net/docs/troubleshooting/
- Диагностика FakeIP: https://podkop.net/docs/diagnostics/

### Варианты решения

#### Вариант 1: Разделение по доменам (рекомендуемый)

Использовать zapret **только** для YouTube/googlevideo, а всё остальное заблокированное — через Podkop (VPN/прокси):

1. В zapret настроить hostlist только на YouTube-домены
2. В Podkop создать exclusion-секцию для youtube (чтобы podkop НЕ трогал этот трафик)
3. Podkop обрабатывает Telegram, Meta, прочие заблокированные сайты через VPN

Пример конфига podkop с exclusion:
```
config section 'exclusion'
  option connection_type 'exclusion'
  option user_domain_list_type 'dynamic'
  list user_domains 'youtube.com'
  list community_lists 'youtube'
```

#### Вариант 2: Только zapret (без podkop)

Если VPN/прокси не нужен — использовать только zapret2. Он может обрабатывать весь трафик через DPI bypass.

#### Вариант 3: Только podkop (YouTube через VPN)

Направить YouTube через VPN-секцию в Podkop. DPI bypass не нужен — трафик идёт через зашифрованный туннель. Минус: нагрузка на VPN-сервер, скорость зависит от VPN.

### Порядок действий при проблемах

1. Проверить диагностику Podkop (`global_check`)
2. Если `⚠️ Zapret detected` — это ожидаемо, само по себе не ошибка
3. Если FakeIP работает и всё открывается — можно не трогать
4. Если что-то не работает:
   - Остановить zapret: `/etc/init.d/zapret stop` (или `/etc/init.d/zapret2 stop`)
   - Перезапустить firewall: `fw4 restart`
   - Проверить без zapret — если заработало, значит конфликт
   - Решать по варианту 1, 2 или 3

## ZeroBlock (Routerich): совместная работа

ZeroBlock — инструмент для Routerich-роутеров (OpenWrt-based), который включает sing-box маршрутизацию и умеет управлять zapret/zapret2.

### Особенности

- ZeroBlock в версии 0.7.0+ имеет встроенную **диагностику zapret/zapret2**: показывает NFQWS_OPT и strategy-секции с hostlist
- ZeroBlock может автоматически загружать секции конфигурации zapret2 с сервера
- DPI Check в ZeroBlock включает YouTube Stream Check (проверка Innertube API + скачивание 5MB видео), который управляет стратегией `rr_youtube` в zapret2

### Рекомендация

Связка ZeroBlock + zapret2 — штатная конфигурация на Routerich-роутерах. При использовании ZeroBlock следовать его документации по настройке zapret2, а не настраивать вручную.

## Общие рекомендации

### Порядок запуска сервисов

На OpenWrt порядок запуска init-скриптов определяется числовым приоритетом. При конфликтах проверить:

```bash
ls -la /etc/rc.d/ | grep -E 'zapret|podkop|sing-box|firewall'
```

### Проверка NFT rules

```bash
# Все правила zapret
nft list ruleset | grep -i zapret

# Все правила с mark
nft list ruleset | grep mark

# Конкретная таблица zapret
nft list table inet zapret
```

### "Всё упало" — экстренное восстановление

```bash
# Остановить zapret
/etc/init.d/zapret stop    # или zapret2
# Убрать из автозагрузки
/etc/init.d/zapret disable

# Перезапустить firewall
fw4 restart

# Проверить интернет
ping -c 3 8.8.8.8
curl -m 5 -I https://ya.ru
```
