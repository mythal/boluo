FROM postgres:18-trixie

RUN apt-get update && apt-get install -y --no-install-recommends \
    cron \
    pgcli \
    neovim \
    htop \
    pg-activity \
    pgbackrest \
    python3-minimal \
    prometheus-pgbackrest-exporter \
    prometheus-postgres-exporter \
    supervisor \
    && rm -rf /var/lib/apt/lists/* \
    && install -d -m 0750 -o root -g postgres /etc/pgbackrest

COPY --chmod=0755 docker-entrypoint-pgbackrest.sh /usr/local/bin/
COPY --chmod=0755 docker-entrypoint-initdb-pgbackrest.sh /docker-entrypoint-initdb.d/
COPY --chmod=0755 pgbackrest-check.sh /usr/local/bin/
COPY --chmod=0755 metrics-aggregator.py /usr/local/bin/
COPY --chown=root:postgres --chmod=0640 pgbackrest.conf /etc/pgbackrest/pgbackrest.conf
COPY --chmod=0644 pgbackrest.cron /etc/cron.d/pgbackrest
COPY --chmod=0644 postgres-exporter.yml /etc/postgres-exporter.yml
COPY --chmod=0644 supervisord.conf /etc/supervisor/supervisord.conf
COPY postgresql.conf /etc/postgresql/postgresql.conf

ENTRYPOINT ["docker-entrypoint-pgbackrest.sh"]
CMD ["postgres", "-c", "config_file=/etc/postgresql/postgresql.conf"]
EXPOSE 5432 9187
