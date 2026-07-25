FROM postgres:18-trixie

RUN apt-get update && apt-get install -y --no-install-recommends \
    pgcli \
    neovim \
    htop \
    pg-activity \
    && rm -rf /var/lib/apt/lists/*

COPY postgresql.conf /etc/postgresql/postgresql.conf

CMD ["postgres", "-c", "config_file=/etc/postgresql/postgresql.conf"]
EXPOSE 5432
