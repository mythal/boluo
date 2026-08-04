#!/usr/bin/python3

import os
import sys
from concurrent.futures import ThreadPoolExecutor
from http.client import HTTPException
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import URLError
from urllib.request import urlopen

UPSTREAMS = (
    ('postgres', 'http://127.0.0.1:9188/metrics', None),
    ('pgbackrest', 'http://127.0.0.1:9854/metrics', 'pgbackrest_'),
)


def fetch_metrics(url: str) -> str:
    with urlopen(url, timeout=5) as response:
        return response.read().decode('utf-8')


def select_metric_prefix(payload: str, prefix: str) -> str:
    selected = []
    for line in payload.splitlines():
        if line.startswith(prefix) or line.startswith(f'# HELP {prefix}') or line.startswith(
            f'# TYPE {prefix}'
        ):
            selected.append(line)
    return '\n'.join(selected)


def collect_upstream(upstream: tuple[str, str, str | None]) -> tuple[str, str | None, int]:
    name, url, prefix = upstream
    try:
        payload = fetch_metrics(url)
        if prefix is not None:
            payload = select_metric_prefix(payload, prefix)
        return name, payload.rstrip(), 1
    except (HTTPException, OSError, UnicodeError, URLError) as error:
        print(f'Failed to collect {name} metrics: {error}', file=sys.stderr, flush=True)
        return name, None, 0


def aggregate_metrics() -> bytes:
    sections = []
    upstream_status = []
    with ThreadPoolExecutor(max_workers=len(UPSTREAMS)) as executor:
        for name, payload, status in executor.map(collect_upstream, UPSTREAMS):
            if payload:
                sections.append(payload)
            upstream_status.append((name, status))

    sections.extend(
        (
            '# HELP boluo_metrics_aggregator_up Whether an upstream metrics endpoint was collected successfully.',
            '# TYPE boluo_metrics_aggregator_up gauge',
            *(f'boluo_metrics_aggregator_up{{upstream="{name}"}} {status}' for name, status in upstream_status),
        )
    )
    return ('\n'.join(sections) + '\n').encode('utf-8')


class MetricsHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path != '/metrics':
            self.send_error(404)
            return

        payload = aggregate_metrics()
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format: str, *args: object) -> None:
        return


def main() -> None:
    port = int(os.environ.get('METRICS_AGGREGATOR_PORT', '9187'))
    server = ThreadingHTTPServer(('0.0.0.0', port), MetricsHandler)
    print(f'Metrics aggregator listening on 0.0.0.0:{port}', flush=True)
    server.serve_forever()


if __name__ == '__main__':
    main()
