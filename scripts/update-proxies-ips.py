#!/usr/bin/env python3
"""Update the CDN CIDR snapshots embedded by the server."""

from __future__ import annotations

import ipaddress
import json
import os
import tempfile
import urllib.request
from pathlib import Path
from typing import Iterable


TEXT_DIR = Path(__file__).resolve().parents[1] / "apps" / "server" / "text"
CLOUDFLARE_SOURCES = (
    "https://www.cloudflare.com/ips-v4/",
    "https://www.cloudflare.com/ips-v6/",
)
FASTLY_SOURCE = "https://api.fastly.com/public-ip-list"
CLOUDFRONT_SOURCE = "https://ip-ranges.amazonaws.com/ip-ranges.json"
MAX_PLAIN_SOURCE_BYTES = 64 * 1024
MAX_CLOUDFRONT_SOURCE_BYTES = 8 * 1024 * 1024
Network = ipaddress.IPv4Network | ipaddress.IPv6Network


def fetch(source: str, limit: int) -> bytes:
    request = urllib.request.Request(
        source,
        headers={"User-Agent": "boluo-proxy-ip-updater/1.0"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        body = response.read(limit + 1)
    if len(body) > limit:
        raise ValueError(f"response exceeds {limit} bytes: {source}")
    return body


def normalize(provider: str, values: Iterable[str]) -> list[Network]:
    networks = sorted(
        {ipaddress.ip_network(value.strip(), strict=True) for value in values if value.strip()},
        key=lambda network: (network.version, int(network.network_address), network.prefixlen),
    )
    if len(networks) < 10:
        raise ValueError(f"{provider} returned too few networks")
    if not any(network.version == 4 for network in networks):
        raise ValueError(f"{provider} returned no IPv4 networks")
    if not any(network.version == 6 for network in networks):
        raise ValueError(f"{provider} returned no IPv6 networks")
    return networks


def cloudflare_networks() -> list[Network]:
    lines = (
        line
        for source in CLOUDFLARE_SOURCES
        for line in fetch(source, MAX_PLAIN_SOURCE_BYTES).decode("utf-8").splitlines()
    )
    return normalize("Cloudflare", lines)


def fastly_networks() -> list[Network]:
    document = json.loads(fetch(FASTLY_SOURCE, MAX_PLAIN_SOURCE_BYTES))
    return normalize(
        "Fastly",
        [*document["addresses"], *document["ipv6_addresses"]],
    )


def cloudfront_networks() -> list[Network]:
    document = json.loads(fetch(CLOUDFRONT_SOURCE, MAX_CLOUDFRONT_SOURCE_BYTES))
    services = {"CLOUDFRONT", "CLOUDFRONT_ORIGIN_FACING"}
    # Include viewer-facing and origin-facing ranges. Regional entries matter
    # because regional edge caches can contact custom origins.
    values = [
        prefix["ip_prefix"]
        for prefix in document["prefixes"]
        if prefix["service"] in services
    ]
    values.extend(
        prefix["ipv6_prefix"]
        for prefix in document["ipv6_prefixes"]
        if prefix["service"] in services
    )
    return normalize("CloudFront", values)


def write_snapshot(target: Path, networks: list[Network]) -> None:
    content = "".join(f"{network}\n" for network in networks)
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=target.parent,
            prefix=f".{target.name}.",
            delete=False,
        ) as temporary:
            temporary.write(content)
            temporary.flush()
            os.fsync(temporary.fileno())
            temporary_path = Path(temporary.name)
        temporary_path.chmod(0o644)
        temporary_path.replace(target)
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


def main() -> None:
    providers = (
        ("Cloudflare", TEXT_DIR / "ips-cloudflare.txt", cloudflare_networks),
        ("Fastly", TEXT_DIR / "ips-fastly.txt", fastly_networks),
        ("CloudFront", TEXT_DIR / "ips-cloudfront.txt", cloudfront_networks),
    )
    for name, target, load in providers:
        networks = load()
        write_snapshot(target, networks)
        print(f"Updated {target} with {len(networks)} {name} networks")


if __name__ == "__main__":
    main()
