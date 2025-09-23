FROM postgres:18rc1-bookworm
COPY postgresql.conf /etc/postgresql/postgresql.conf

CMD ["postgres", "-c", "config_file=/etc/postgresql/postgresql.conf"]
EXPOSE 5432
