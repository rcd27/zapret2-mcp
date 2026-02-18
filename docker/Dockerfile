FROM openwrt/rootfs:x86_64

# Обновляем списки пакетов и ставим базовые утилиты
RUN mkdir -p /var/lock /var/run && \
    apk update && \
    apk add curl bash nano git git-http

# Рабочая директория для zapret2
RUN mkdir -p /opt/zapret2

WORKDIR /opt

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["bash"]
