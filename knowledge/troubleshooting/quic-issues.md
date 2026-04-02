---
title: QUIC-проблемы — почему YouTube тормозит и как это чинить
zapret2-version: v0.9.4.5
tags: troubleshooting, quic, udp, youtube, performance, disable-quic, podkop, browser
source: community
created: 2026-03-28
updated: 2026-04-02
---

# QUIC: главный незаметный враг YouTube на роутере

## Что такое QUIC и почему это проблема

QUIC (HTTP/3) — транспортный протокол поверх UDP на порту 443, стандартизированный IETF (RFC 9000). Широко используется Google, Cloudflare, Meta и другими. Современные браузеры и приложения **предпочитают QUIC** вместо обычного HTTPS (TCP). Проблема в том, что:

1. **ТСПУ умеет блокировать/замедлять QUIC** отдельно от HTTPS
2. **Стратегии zapret2 для TCP не работают для QUIC** — это совершенно другой протокол
3. **Приложение само выбирает QUIC** без ведома пользователя — и тихо тормозит

### Как это выглядит

Типичные симптомы незакрытого QUIC:
- YouTube открывается, но видео бесконечно буферизуется или грузится в 480p
- Сайты Google грузятся по 20 секунд
- "На ПК работает, на телефоне нет" (разные приложения по-разному используют QUIC)
- "В одном браузере работает, в другом нет" (все основные браузеры включают QUIC по умолчанию, но поведение fallback различается)
- Стратегия zapret2 для TCP работает (`curl` на роутере OK), но YouTube всё равно тормозит

### Почему это происходит

```
Без QUIC:
  Браузер → TCP:443 → nfqws2 обрабатывает → DPI обманут → YouTube работает

С QUIC (без UDP-секции в конфиге):
  Браузер → UDP:443 (QUIC) → nfqws2 НЕ обрабатывает (нет секции --filter-udp в конфиге)
                            → ТСПУ распознаёт QUIC → замедление/блокировка
                            → YouTube тормозит
```

Браузер пытается использовать QUIC, QUIC замедляется ТСПУ, браузер fallback-ит на TCP через 5-30 секунд (или не fallback-ит вовсе). Результат — непредсказуемое поведение.

## Решения

### 1. Отключить QUIC — самое простое и надёжное

Принудительно заблокировать UDP:443, чтобы весь трафик шёл через TCP, где стратегии zapret2 работают.

#### На роутере (nftables) — для всех устройств разом

```bash
# Создать файл правила
cat > /etc/nftables.d/99-block-quic.nft <<'EOF'
chain block_quic {
  type filter hook forward priority filter - 5; policy accept;
  udp dport 443 drop comment "block QUIC, force TCP fallback"
}
EOF

# Применить
/etc/init.d/firewall restart
```

Это заблокирует QUIC для ВСЕХ устройств за роутером. Браузеры автоматически переключатся на TCP.

#### Только для конкретного устройства (например ТВ)

```bash
cat > /etc/nftables.d/99-tv-no-quic.nft <<'EOF'
define TV_IP = 192.168.1.100

chain tv_no_quic {
  type filter hook forward priority filter - 5; policy accept;
  ip saddr $TV_IP udp dport 443 drop comment "TV: block QUIC"
}
EOF

/etc/init.d/firewall restart
```

#### В Podkop

В LuCI: Services → Podkop → Settings → **Disable QUIC** (Отключить QUIC) → включить.

Или через UCI:
```bash
uci set podkop.settings.disable_quic='1'
uci commit podkop
/etc/init.d/podkop restart
```

#### В браузере Chrome/Chromium

Открыть `chrome://flags`, найти `Experimental QUIC protocol`, установить **Disabled**.

#### В конфиге zapret (v1)

```bash
# В /opt/zapret/config:
MODE_QUIC=0    # отключить обработку QUIC в zapret
```

### 2. Обрабатывать QUIC в zapret2 — сложнее, но правильнее

Если нужно чтобы QUIC работал (например для скорости), можно добавить стратегию bypass для QUIC:

```
NFQWS2_OPT="
--name=https
  --filter-tcp=443 --filter-l7=tls
  --payload=tls_client_hello
  --lua-desync=multisplit:pos=10:seqovl=1
--new
--name=quic
  --filter-udp=443 --filter-l7=quic
  --payload=quic_initial
  --lua-desync=fake:blob=fake_default_quic:repeats=6
"
```

Но QUIC bypass **сложнее** TCP bypass:
- QUIC зашифрован с первого пакета — nfqws2 расшифровывает QUIC Initial для извлечения SNI, но манипулировать SNI бессмысленно (DPI тоже расшифровывает)
- Основная стратегия — fake packets (отправить поддельный QUIC Initial)
- Результат менее предсказуем чем для TCP
- Не все ТСПУ одинаково обрабатывают QUIC

### 3. Отдельная QUIC-секция в конфиге zapret2

В zapret2 QUIC-обработка добавляется как отдельная секция через `--new`:

```
NFQWS2_OPT="
--name=https
  --filter-tcp=443 --filter-l7=tls
  --payload=tls_client_hello
  --lua-desync=multisplit:pos=10:seqovl=1
--new
--name=quic
  --filter-udp=443 --filter-l7=quic
  --payload=quic_initial
  --lua-desync=fake:blob=fake_default_quic:repeats=11
"
```

Доступные blob-ы для QUIC fake: `fake_default_quic`, `quic_initial_www_google_com`, `quic_initial_facebook_com` и др. Количество repeats критично — UDP не гарантирует доставку, для агрессивного DPI может потребоваться 8-11 повторений.

## Частые ошибки

### "disable_quic" в podkop стоит 0

В подавляющем большинстве конфигов из чатов `disable_quic='0'` — QUIC **не отключён**. Это значит что YouTube-трафик может идти через QUIC мимо zapret и тормозить.

### QUIC не отключён в браузере

Chrome по умолчанию использует QUIC. Даже если на роутере стоит zapret с рабочей TCP-стратегией, Chrome пойдёт через QUIC и будет тормозить.

### Private DNS на Android

Android с включённым Private DNS (DoH/DoT) может отправлять DNS-запросы мимо роутера. Это не QUIC напрямую, но часто путают с QUIC-проблемой. Симптомы похожи — "на ПК работает, на телефоне нет".

**Решение**: на Android → Настройки → Сеть → Приватный DNS → **Выкл**.

### Яндекс ТВ и другие SmartTV

SmartTV могут использовать свои DNS-серверы и QUIC, игнорируя настройки роутера. Для ТВ рекомендуется:
1. Заблокировать QUIC для IP телевизора (см. nftables правило выше)
2. Перехватить DNS-запросы ТВ на роутере (force DNS redirect)

## Чеклист: YouTube тормозит

1. [ ] Проверить: `curl -m 5 -I https://www.youtube.com` на роутере — если OK, стратегия TCP работает
2. [ ] Проверить QUIC: `disable_quic` в podkop / наличие секции `--filter-udp=443` в конфиге zapret2
3. [ ] Если QUIC не отключён — отключить (самый быстрый фикс)
4. [ ] Проверить Private DNS на Android-устройствах
5. [ ] Проверить QUIC в браузере: `chrome://flags` → QUIC → Disabled
6. [ ] Если нужен QUIC — добавить секцию `--filter-udp=443` в стратегию zapret2
7. [ ] Для ТВ — блокировать QUIC через nftables для конкретного IP
